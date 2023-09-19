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
        //Read our Github Token
        const githubToken = core.getInput('github_token') || process.env.GITHUB_TOKEN;
        //Get our Github Ref and Branch
        const GITHUB_REF = process.env.GITHUB_REF || '';
        const branch = core.getInput('branch') ||
            process.env.BRANCH ||
            GITHUB_REF.split('/').reverse()[0] ||
            'master';
        //Grab the version file location
        const versionPath = core.getInput('version_file') || 'version.json';
        //If our version file doesn't exist, write an initial one.
        if (!fs.existsSync(versionPath)) {
            fs.writeFileSync(versionPath, '{"version":"0.0.0"}', 'utf8');
        }
        //Grab prefix.  Unused by us currently but leaving it in
        const prefix = (core.getInput('prefix') || '').trim();
        //Read in our version file and parse it
        var versionjson = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
        //Since its JSON we need to grab out the version variable. 
        const version = versionjson["version"];
        console.log('old version is:' + version);
        //Determin our increment type, then use the inc function from the semver package to increment correctly.
        const incrementType = core.getInput('increment_type') || 'patch';
        //TODO is there a better way to enforce correct increment type?
        const newVersion = semver_1.inc(version, incrementType == 'major' ? 'major' :
            incrementType == 'minor' ? 'minor' :
                incrementType == 'prerelease' ? 'prerelease' : 'patch', incrementType == 'prerelease' ? 'prerelease' : '');
        if (!newVersion) {
            throw new Error('could not bump version ' + version);
        }
        //Set our version to our new version and write the file back out to the file location
        versionjson["version"] = newVersion;
        console.log('writing new version file');
        fs.writeFileSync(versionPath, JSON.stringify(versionjson, null, 2), 'utf8');

        //Grab a prefix tag if necessary.  for go we will often prefix tags with v since it uses that for modules.
        const prefixTag = core.getInput('prefix_tag') || '';
        const tagName = prefix ? prefixTag + prefix + '_' + newVersion : prefixTag + newVersion;
        const tagMsg = `${support_1.capitalize(prefix) + ' '}Version ${newVersion} [skip ci]`;
        //Commit
        yield commit_1.default({
            USER_EMAIL: 'bump-version@version.com',
            USER_NAME: 'bump_version',
            GITHUB_TOKEN: githubToken,
            MESSAGE: tagMsg,
            tagName,
            tagMsg,
            branch,
        });
        const shouldtagstring = core.getInput('tag') || 'false';
        var shouldtag = shouldtagstring == "true" ? true : false;
        //Tag if shouldtag is true
        if (shouldtag) {
            yield createTag_1.createTag({
                tagName,
                tagMsg,
            });
        }
        console.log('setting output version=' + newVersion + ' prefix=' + prefix);
        yield createAnnotation_1.createAnnotations({ githubToken, newVersion: tagMsg });
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
