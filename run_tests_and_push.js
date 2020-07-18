const glob = require('glob');
const fs = require('fs');
const { exec } = require("child_process");

const IMAGE_PREFIX = 'docker.pkg.github.com/techulus/glot-containers';

const runCommand = async (cmd) => {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      if (stderr) {
        reject(stderr);
        return;
      }

      resolve(stdout);
    })
  });
};

const getFiles = async (path) => {
  return new Promise((resolve, reject) => {
    glob(path, function (err, files) {
      if (err) return reject(err);

      resolve(files);
    });
  });
};

runTest = async () => {
  try {
    const imageFiles = await getFiles("**/Dockerfile");
    // console.log("images", imageFiles)

    let file, folder, testFiles;

    for (let i = 0; i < imageFiles.length; i++) {
      file = imageFiles[i]
      folder = file.replace('/Dockerfile', '')

      testFiles = await getFiles(folder + "/**/payload.json");
      resultFiles = await getFiles(folder + "/**/result.json");
      // console.log('tests', testFiles)

      const imageName = [IMAGE_PREFIX, folder.replace('/', ':')].join('/');

      for (let j = 0; j < testFiles.length; j++) {
        // ======= build
        console.log('build', imageName)
        await runCommand(`docker build ./${folder} -t ${imageName}`);

        // ======= run
        console.log('run', imageName)
        const result = await runCommand(`docker run -i --rm ${imageName} < ${testFiles[j]}`);
        console.log('result', result);
        const expected = fs.readFileSync(resultFiles[j], "utf8");
        console.log('expected', expected);

        // ======= test 
        if (result === expected) {
          console.log("test passed")
          
          // ======= push
          console.log("push image")
          const remoteResponse = await runCommand(`docker push ${imageName}`);
          console.log("push image done", remoteResponse)
        } else {
          console.log("test failed")
          process.exit(1);
        }
      }
    }

  } catch (err) {
    return console.error('failed to run tests', err);
  }
};

runTest();