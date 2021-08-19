import * as core from '@actions/core'
import * as fs from 'fs'
import commit from './commit'
import { createTag } from './createTag'
import {
    capitalize,
    replacePattern,
    LineReplaced,
    versionRegex,
} from './support'
import { inc } from 'semver'

import { createAnnotations } from './createAnnotation'

async function run() {
    

    //Read our Github Token
    const githubToken =
        core.getInput('github_token') || process.env.GITHUB_TOKEN
    const ignore =
        core
            .getInput('ignore')
            .split(',')
            .map((x) => x.trim())
            .filter(Boolean) || []

    //Get our Github Ref and Branch
    const GITHUB_REF = process.env.GITHUB_REF || ''
    const branch =
        core.getInput('branch') ||
        process.env.BRANCH ||
        GITHUB_REF.split('/').reverse()[0] ||
        'master'
    
    //Grab the version file location
    const versionPath = core.getInput('version_file') || 'version.json'

    //If our version file doesn't exist, write an initial one.
    if (!fs.existsSync(versionPath)) {
        fs.writeFileSync(versionPath, '{"version":"0.0.0"}', 'utf8')
    }

    //Grab prefix.  Unused by us currently but leaving it in
    const prefix = (core.getInput('prefix') || '').trim()

    //Read in our version file and parse it
    var versionjson = JSON.parse(fs.readFileSync(versionPath, 'utf8'))   

    //Since its JSON we need to grab out the version variable. 
    const version = versionjson["version"]    
    console.log('old version is:' + version)
    //Determin our increment type, then use the inc function from the semver package to increment correctly.
    const incrementType = core.getInput('increment_type') || 'patch'    
    //TODO is there a better way to enforce correct increment type?
    const newVersion = inc(
        version,
        incrementType=='major' ? 'major' :
        incrementType=='minor' ? 'minor' : 
        incrementType=='prerelease' ? 'prerelease' : 'patch',
        incrementType=='prerelease' ? 'prerelease' : ''
    )
    if (!newVersion) {
        throw new Error('could not bump version ' + version)
    }
    
    //Set our version to our new version and write the file back out to the file location
    versionjson["version"] = newVersion
    console.log('writing new version file')
    fs.writeFileSync(versionPath, JSON.stringify(versionjson, null, 2), 'utf8')

    //Look through files and replace version in lines after [bump] with the new version
    let linesReplaced: LineReplaced[] = []
    if (prefix) {
        console.log(`replacing version patterns below [bump if ${prefix}]`)
        const pattern = new RegExp('\\[bump if ' + prefix + '\\]')
        const res = await replacePattern({
            pattern,
            replacer: versionRegex,
            value: newVersion,
            ignore,
        })
        linesReplaced = res.linesReplaced
    } else {
        console.log(`replacing version patterns below [bump]`)
        const res = await replacePattern({
            pattern: /\[bump\]/,
            replacer: versionRegex,
            value: newVersion,
            ignore,
        })
        linesReplaced = res.linesReplaced
    }

    //Grab a prefix tag if necessary.  for go we will often prefix tags with v since it uses that for modules.
    const prefixTag = core.getInput('prefix_tag') || ''
    const tagName = prefix ? prefixTag + prefix + '_' + newVersion : prefixTag + newVersion
    const tagMsg = `${capitalize(prefix) + ' '}Version ${newVersion} [skip ci]`

    //Commit
    await commit({
            USER_EMAIL: 'bump-version@version.com',
            USER_NAME: 'bump_version',
            GITHUB_TOKEN: githubToken,
            MESSAGE: tagMsg,
            tagName,
            tagMsg,
            branch,
        })

    const shouldtagstring = core.getInput('tag') || 'false'
    var shouldtag = shouldtagstring == "true" ? true : false

    //Tag if shouldtag is true
    if(shouldtag){
        await createTag({
            tagName,
            tagMsg,
        })
    }

    console.log('setting output version=' + newVersion + ' prefix=' + prefix)
    await createAnnotations({ githubToken, newVersion: tagMsg, linesReplaced })
    core.setOutput('version', newVersion)
    core.setOutput('prefix', prefix)
    core.info(`new version ${tagMsg}`)
}

try {
    run()
} catch (e) {
    console.error(e)
}
