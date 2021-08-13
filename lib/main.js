"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const commit_1 = __importDefault(require("./commit"));
const createTag_1 = require("./createTag");
const support_1 = require("./support");
const semver_1 = require("semver");
const createAnnotation_1 = require("./createAnnotation");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const githubToken = core.getInput('github_token') || process.env.GITHUB_TOKEN;
        const ignore = core
            .getInput('ignore')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean) || [];
        const GITHUB_REF = process.env.GITHUB_REF || '';
        const branch = core.getInput('branch') ||
            process.env.BRANCH ||
            GITHUB_REF.split('/').reverse()[0] ||
            'master';
        const versionPath = core.getInput('version_file') || 'version.json';
        if (!fs.existsSync(versionPath)) {
            fs.writeFileSync(versionPath, '0.0.0', 'utf8');
        }
        const prefix = (core.getInput('prefix') || '').trim();
        var versionjson = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
        const version = versionjson["version"];
        const preReleaseTag = core.getInput('prerelease_tag') || '';
        const newVersion = semver_1.inc(version, preReleaseTag ? 'prerelease' : 'patch', preReleaseTag !== null && preReleaseTag !== void 0 ? preReleaseTag : undefined);
        if (!newVersion) {
            throw new Error('could not bump version ' + version);
        }
        versionjson["version"] = newVersion;
        console.log('writing new version file');
        fs.writeFileSync(versionPath, JSON.stringify(versionjson), 'utf8');
        let linesReplaced = [];
        if (prefix) {
            console.log(`replacing version patterns below [bump if ${prefix}]`);
            const pattern = new RegExp('\\[bump if ' + prefix + '\\]');
            const res = yield support_1.replacePattern({
                pattern,
                replacer: support_1.versionRegex,
                value: newVersion,
                ignore,
            });
            linesReplaced = res.linesReplaced;
        }
        else {
            console.log(`replacing version patterns below [bump]`);
            const res = yield support_1.replacePattern({
                pattern: /\[bump\]/,
                replacer: support_1.versionRegex,
                value: newVersion,
                ignore,
            });
            linesReplaced = res.linesReplaced;
        }
        const tagName = prefix ? prefix + '_' + newVersion : newVersion;
        const tagMsg = `${support_1.capitalize(prefix) + ' '}Version ${newVersion} [skip ci]`;
        yield Promise.all([
            commit_1.default({
                USER_EMAIL: 'bump-version@version.com',
                USER_NAME: 'bump_version',
                GITHUB_TOKEN: githubToken,
                MESSAGE: tagMsg,
                tagName,
                tagMsg,
                branch,
            }),
            createTag_1.createTag({
                tagName,
                tagMsg,
            }),
        ]);
        console.log('setting output version=' + newVersion + ' prefix=' + prefix);
        yield createAnnotation_1.createAnnotations({ githubToken, newVersion: tagMsg, linesReplaced });
        core.setOutput('version', newVersion);
        core.setOutput('prefix', prefix);
        core.info(`new version ${tagMsg}`);
    });
}
try {
    run();
}
catch (e) {
    console.error(e);
}
