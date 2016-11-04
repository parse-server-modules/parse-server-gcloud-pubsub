'use strict';

class GCPUtil {
    static requiredOrFromEnvironment(options, key, env) {
        options[key] = options[key] || process.env[env];
        if (!options[key]) {
            throw `GCP Pub/Sub requires an ${key}`;
        }
        return options
    }

    static createOptionsFromEnvironment() {
        let options = {};
        options = this.requiredOrFromEnvironment(options, 'projectId', 'GCP_PROJECT_ID');
        options = this.requiredOrFromEnvironment(options, 'keyFilename', 'GCP_KEYFILE_PATH');
        return options;
    }
}

export {
    GCPUtil
};