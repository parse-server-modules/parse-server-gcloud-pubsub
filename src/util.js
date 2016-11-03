'use strict';

class GCPUtil {
    static requiredOrFromEnvironment(options, key, env) {
        options[key] = options[key] || process.env[env];
        if (!options[key]) {
            throw `GCP Pub/Sub requires an ${key}`;
        }
        return options
    }
}

export {
    GCPUtil
};