import path from 'path';
import fs from 'fs';

// quote arg if it contains space
export function quote(args: string[]) {
    return args.map((arg) => {
        return (arg.indexOf(' ') >= 0) ? '"' + arg + '"' : arg;
    });
}

export function mkdirp(filePath: string) {
    console.log("mkdirp filePath", filePath);
    var dir = path.dirname(filePath);
    console.log("mkdirp dir", dir);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
