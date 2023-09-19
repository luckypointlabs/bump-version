import * as fs from 'fs'
import retrier from 'retry'
import * as path from 'path'
import { glob } from 'smart-glob'

export interface LineReplaced {
    line: number
    path: string
    newValue: string
}

export const capitalize = (prefix) => {
    return prefix.charAt(0).toUpperCase() + prefix.slice(1)
}

const defaultOpts = {
    randomize: true,
    onRetry: (e, i) => console.error(`retrying after error: ${e}`),
    retries: 3,
}

export function retry(fn, opts = defaultOpts) {
    function run(resolve, reject) {
        var options = opts || {}
        var op

        op = retrier.operation(options)

        // We allow the user to abort retrying
        // this makes sense in the cases where
        // knowledge is obtained that retrying
        // would be futile (e.g.: auth errors)

        function bail(err) {
            reject(err || new Error('Aborted'))
        }

        function onError(err, num) {
            if (err.bail) {
                bail(err)
                return
            }

            if (!op.retry(err)) {
                reject(op.mainError())
            } else if (options.onRetry) {
                options.onRetry(err, num)
            }
        }

        function runAttempt(num) {
            var val

            try {
                val = fn(bail, num)
            } catch (err) {
                onError(err, num)
                return
            }

            Promise.resolve(val)
                .then(resolve)
                .catch(function catchIt(err) {
                    onError(err, num)
                })
        }

        op.attempt(runAttempt)
    }

    return new Promise(run)
}
