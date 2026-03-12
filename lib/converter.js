const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

function ffmpeg(media, args = [], ext = '', ext2 = '') {
  return new Promise(async (resolve, reject) => {
    const isPath = typeof media === 'string';
    let tmp = isPath ? media : path.join(__dirname, '../database/temp', + new Date + '.' + ext);
    let out = path.join(__dirname, '../database/temp', + new Date + 'out.' + ext2);
    try {
      if (!isPath) await fs.promises.writeFile(tmp, media);
      spawn('ffmpeg', [
        '-y',
        '-i', tmp,
        ...args,
        out
      ])
        .on('error', (err) => {
          if (!isPath && fs.existsSync(tmp)) fs.unlinkSync(tmp);
          if (fs.existsSync(out)) fs.unlinkSync(out);
          reject(err);
        })
        .on('close', async (code) => {
          try {
            if (code !== 0) throw new Error(`FFmpeg exited with code ${code}`);
            resolve(out);
          } catch (e) {
            if (fs.existsSync(out)) fs.unlinkSync(out);
            reject(e);
          } finally {
            if (!isPath && fs.existsSync(tmp)) fs.unlinkSync(tmp);
          }
        });
    } catch (e) {
      if (!isPath && fs.existsSync(tmp)) fs.unlinkSync(tmp);
      reject(e);
    }
  })
}

function ffmpeg2(media, args = [], ext = '', ext2 = '') {
  return new Promise(async (resolve, reject) => {
    const isPath = typeof media === 'string';
    let tmp = isPath ? media : path.join(__dirname, '../database/temp', + new Date + '.' + ext);
    let out = path.join(__dirname, '../database/temp', + new Date + 'out.' + ext2);
    try {
      if (!isPath) await fs.promises.writeFile(tmp, media);
      spawn('ffmpeg', ['-y', '-i', tmp, ...args, out])
        .on('error', (err) => {
          if (!isPath && fs.existsSync(tmp)) fs.unlinkSync(tmp);
          if (fs.existsSync(out)) fs.unlinkSync(out);
          reject(err);
        })
        .on('close', async (code) => {
          try {
            if (code !== 0) throw new Error(`FFmpeg exited with code ${code}`);
            const resultBuffer = await fs.promises.readFile(out);
            resolve(resultBuffer);
          } catch (e) {
            reject(e);
          } finally {
            if (!isPath && fs.existsSync(tmp)) fs.unlinkSync(tmp);
            if (fs.existsSync(out)) fs.unlinkSync(out);
          }
        });
    } catch (e) {
      if (!isPath && fs.existsSync(tmp)) fs.unlinkSync(tmp);
      reject(e);
    }
  })
}

function toAudio(media, ext) {
  return ffmpeg(media, ['-vn', '-ac', '2', '-b:a', '128k', '-ar', '44100', '-f', 'mp3'], ext, 'mp3')
}

function toPTT(media, ext) {
  return ffmpeg2(media, ['-vn', '-c:a', 'libopus', '-b:a', '128k', '-vbr', 'on', '-compression_level', '10'], ext, 'opus')
}

function toVideo(media, ext) {
  return ffmpeg(media, ['-c:v', 'libx264', '-c:a', 'aac', '-ab', '128k', '-ar', '44100', '-crf', '32', '-preset', 'slow'], ext, 'mp4')
}

module.exports = {
  toAudio,
  toPTT,
  toVideo,
  ffmpeg,
  ffmpeg2
}