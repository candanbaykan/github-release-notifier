export default interface Repository {
    owner: string;
    repository: string;
    excludePrerelease: boolean;
    blacklist: Array<string>;
    lastPublish: string;
}
