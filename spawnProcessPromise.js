const childProcess = require('child_process');

const spawnProcessPromise = function (command, args, cwd) {
  return new Promise((resolve, reject) => {
    console.log('execute: ', command, args.join(' '));

    const cp = childProcess.spawn(command, args, {env: process.env, cwd: cwd || process.cwd(), shell: process.platform == 'win32'});
    const resultBuffers = [];

    cp.stdout.on('data', buffer => {
      console.log(buffer.toString());
      resultBuffers.push(buffer);
    });

    cp.stderr.on('data', buffer => console.error(buffer.toString()));

    cp.on('exit', (code, signal) => {
      console.log(`Done ${code}:${signal}`);

      if (code || signal) {
        reject(`${command} failed with ${code || signal}`);
      } else {
        resolve(Buffer.concat(resultBuffers).toString().trim());
      }
    });
  });
};

module.exports = spawnProcessPromise;
