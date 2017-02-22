'use strict';

class GCPUtil {
    static requiredOrFromEnvironment(options, key, env) {
        options[key] = options[key] || process.env[env];
        if (!options[key]) {
            throw `GCP Pub/Sub requires an ${key}`;
        }
        return options
    }

    static fromEnvironmentOrDefault(options, key, env, defaultValue) {
        options[key] = options[key] || process.env[env] || defaultValue;
        return options;
    }

    static createOptionsFromEnvironment() {
        let options = {};
        options = this.fromEnvironmentOrDefault(options, 'projectId', 'GCP_PROJECT_ID',undefined);
        options = this.fromEnvironmentOrDefault(options, 'keyFilename', 'GCP_KEYFILE_PATH',undefined);
        return options;
    }
}

export {
    GCPUtil
};