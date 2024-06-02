import { parseCronExpression } from "cron-schedule";
import { IntervalBasedCronScheduler } from "cron-schedule/schedulers/interval-based.js";
import nodemailer from "nodemailer";
import { Octokit } from "octokit";
import pino from "pino";
import type Repository from "./models/repository";
import { isBlacklisted } from "./utils";

const logger = pino({
    transport: {
        target: "pino-pretty",
        options: {
            translateTime: "UTC:yyyy-mm-dd HH:MM:ss.l o"
        }
    }
});

try {
    const scheduler = new IntervalBasedCronScheduler(60_000);
    const cron = parseCronExpression(Bun.env.CRON ?? "0 * * * *");

    const octokit = new Octokit();

    const filename = "repositories.json";
    const file = Bun.file(filename);
    const repos: Array<Repository> = await file.json();

    const transporter = nodemailer.createTransport({
        host: Bun.env.SMTP_HOST,
        port: Bun.env.SMTP_PORT,
        secure: false,
        auth: {
            user: Bun.env.SMTP_USER,
            pass: Bun.env.SMTP_PASSWORD
        }
    });

    scheduler.registerTask(
        cron,
        async () => {
            for (const repo of repos) {
                const response = await octokit.request("GET /repos/{owner}/{repo}/releases", {
                    owner: repo.owner,
                    repo: repo.repository,
                    per_page: 20
                });

                const lastPublish = new Date(repo.lastPublish);

                for (const release of response.data) {
                    if (!release.published_at) {
                        continue;
                    }

                    const publishedAt = new Date(release.published_at);

                    if (publishedAt <= lastPublish) {
                        logger.info(`No new release for ${repo.owner}/${repo.repository}`);
                        break;
                    }

                    if (repo.excludePrerelease && release.prerelease) {
                        continue;
                    }

                    if (isBlacklisted(release, repo)) {
                        continue;
                    }

                    logger.info(`New release "${release.name}" found for ${repo.owner}/${repo.repository}`);

                    logger.info(`Sending mail for new release: ${release.name}`);

                    await transporter.sendMail({
                        from: Bun.env.MAIL_FROM,
                        to: Bun.env.MAIL_TO,
                        subject: `GitHub Release Notifier: ${release.name}`,
                        html: `<a href="${release.html_url}">Go to Release Page</a>`
                    });

                    logger.info(`Mail sent for new release: ${release.name}`);

                    repo.lastPublish = release.published_at;
                    break;
                }
            }

            logger.info(`Updating ${filename}`);
            await Bun.write(file, JSON.stringify(repos, null, 4));
            logger.info(`${filename} updated`);
        },
        {
            isOneTimeTask: false,
            errorHandler: e => logger.error(e, "An unexpected error occurred")
        }
    );

    logger.info("Notifier task registered");
} catch (error) {
    logger.fatal(error, "Fatal error occurred");
}
