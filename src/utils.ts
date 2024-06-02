import type Release from "./models/release";
import type Repository from "./models/repository";

export function isBlacklisted(release: Release, repository: Repository): boolean {
    const name = release.name?.toLowerCase();

    if (!name) {
        return false;
    }

    for (const token of repository.blacklist) {
        if (name.includes(token.toLowerCase())) {
            return true;
        }
    }

    return false;
}
