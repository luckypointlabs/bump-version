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
const fs = __importStar(require("fs"));
const retry_1 = __importDefault(require("retry"));
const smart_glob_1 = require("smart-glob");

exports.capitalize = (prefix) => {
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
};

const defaultOpts = {
    randomize: true,
    onRetry: (e, i) => console.error(`retrying after error: ${e}`),
    retries: 3,
};
function retry(fn, opts = defaultOpts) {
    function run(resolve, reject) {
        var options = opts || {};
        var op;
        op = retry_1.default.operation(options);
        // We allow the user to abort retrying
        // this makes sense in the cases where
        // knowledge is obtained that retrying
        // would be futile (e.g.: auth errors)
        function bail(err) {
            reject(err || new Error('Aborted'));
        }
        function onError(err, num) {
            if (err.bail) {
                bail(err);
                return;
            }
            if (!op.retry(err)) {
                reject(op.mainError());
            }
            else if (options.onRetry) {
                options.onRetry(err, num);
            }
        }
        function runAttempt(num) {
            var val;
            try {
                val = fn(bail, num);
            }
            catch (err) {
                onError(err, num);
                return;
            }
            Promise.resolve(val)
                .then(resolve)
                .catch(function catchIt(err) {
                onError(err, num);
            });
        }
        op.attempt(runAttempt);
    }
    return new Promise(run);
}
exports.retry = retry;
