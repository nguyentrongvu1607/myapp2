const path = require('path')
const fs = require('fs')
const debug = require('debug')('truck')

const Jimp = require('jimp')

function move(oldPath, dir, pathFile) {
  let newPath = path.join(dir, pathFile);
  createFolder(newPath);
  return new Promise(function (resolve, reject) {
    function callback(err, rs) {
      if (err) return reject(err);
      resolve(pathFile);
    }

    fs.rename(oldPath, newPath, function (err) {
      if (err) {
        if (err.code === 'EXDEV') {
          copy();
        } else {
          callback(err);
        }
        return;
      }
      callback();
    });

    function copy() {
      var readStream = fs.createReadStream(oldPath);
      var writeStream = fs.createWriteStream(newPath);

      readStream.on('error', callback);
      writeStream.on('error', callback);

      readStream.on('close', function () {
        fs.unlink(oldPath, callback);
      });

      readStream.pipe(writeStream);
    }
  });
}
async function resizeImage(rootImagePath, newImagePath, _callback) {
  // open a file called "lenna.png"
  debug('jaa', rootImagePath);
  return Jimp.read(rootImagePath, function (err, lenna) {
    debug('err', err);
    if (err) {
      debug(err)
      return _callback(err.message)
    }

    const width = lenna.bitmap.width
    const height = lenna.bitmap.height
    const cropDistance = width > height ? height : width
    const startPointX = (width - cropDistance) / 2
    const startPointY = (height - cropDistance) / 3;
    debug('conaa')
    lenna.crop(startPointX, startPointY, cropDistance, cropDistance) // resize
      .write(newImagePath) // save
    _callback(0, newImagePath)
  });
}


function createFolder(newPath) {
  newPath = path.normalize(newPath);
  if (!fs.existsSync(newPath)) {
    const sep = path.sep;
    const initDir = path.isAbsolute(newPath) ? sep : '';
    var paths = newPath.split(sep);
    var last = paths[paths.length - 1];
    if (path.extname(last)) delete paths[paths.length - 1];
    newPath = paths.reduce((parentDir, childDir) => {
      const curDir = path.resolve(parentDir, childDir);
      if (!fs.existsSync(curDir)) {
        fs.mkdirSync(curDir);
      }

      return curDir;
    }, initDir);
  }

  return newPath;
}

module.exports = Jimp
module.exports.resizeImage = resizeImage;
module.exports.createFolder = createFolder;
module.exports.move = move;