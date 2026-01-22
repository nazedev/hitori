const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const gm = require('gm').subClass({ imageMagick: true });
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Set FFmpeg and FFprobe paths
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

/**
 * FFmpeg Helper Functions
 */
class MediaProcessor {
    constructor() {
        this.tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Convert audio to different format
     */
    async convertAudio(inputBuffer, outputFormat = 'mp3') {
        const inputPath = path.join(this.tempDir, `input_${Date.now()}.audio`);
        const outputPath = path.join(this.tempDir, `output_${Date.now()}.${outputFormat}`);

        try {
            await writeFile(inputPath, inputBuffer);

            return new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .toFormat(outputFormat)
                    .on('end', async () => {
                        const buffer = fs.readFileSync(outputPath);
                        await this.cleanup(inputPath, outputPath);
                        resolve(buffer);
                    })
                    .on('error', async (err) => {
                        await this.cleanup(inputPath, outputPath);
                        reject(err);
                    })
                    .save(outputPath);
            });
        } catch (error) {
            await this.cleanup(inputPath, outputPath);
            throw error;
        }
    }

    /**
     * Convert video to different format
     */
    async convertVideo(inputBuffer, outputFormat = 'mp4') {
        const inputPath = path.join(this.tempDir, `input_${Date.now()}.video`);
        const outputPath = path.join(this.tempDir, `output_${Date.now()}.${outputFormat}`);

        try {
            await writeFile(inputPath, inputBuffer);

            return new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .toFormat(outputFormat)
                    .videoCodec('libx264')
                    .audioCodec('aac')
                    .on('end', async () => {
                        const buffer = fs.readFileSync(outputPath);
                        await this.cleanup(inputPath, outputPath);
                        resolve(buffer);
                    })
                    .on('error', async (err) => {
                        await this.cleanup(inputPath, outputPath);
                        reject(err);
                    })
                    .save(outputPath);
            });
        } catch (error) {
            await this.cleanup(inputPath, outputPath);
            throw error;
        }
    }

    /**
     * Extract audio from video
     */
    async extractAudio(inputBuffer, outputFormat = 'mp3') {
        const inputPath = path.join(this.tempDir, `input_${Date.now()}.video`);
        const outputPath = path.join(this.tempDir, `output_${Date.now()}.${outputFormat}`);

        try {
            await writeFile(inputPath, inputBuffer);

            return new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .toFormat(outputFormat)
                    .noVideo()
                    .on('end', async () => {
                        const buffer = fs.readFileSync(outputPath);
                        await this.cleanup(inputPath, outputPath);
                        resolve(buffer);
                    })
                    .on('error', async (err) => {
                        await this.cleanup(inputPath, outputPath);
                        reject(err);
                    })
                    .save(outputPath);
            });
        } catch (error) {
            await this.cleanup(inputPath, outputPath);
            throw error;
        }
    }

    /**
     * Create video thumbnail
     */
    async createThumbnail(inputBuffer, options = {}) {
        const { count = 1, timestamps = ['00:00:01'], size = '320x240' } = options;
        const inputPath = path.join(this.tempDir, `input_${Date.now()}.video`);
        const outputPath = path.join(this.tempDir, `thumb_${Date.now()}.jpg`);

        try {
            await writeFile(inputPath, inputBuffer);

            return new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .screenshots({
                        count,
                        timestamps,
                        filename: path.basename(outputPath),
                        folder: this.tempDir,
                        size
                    })
                    .on('end', async () => {
                        const buffer = fs.readFileSync(outputPath);
                        await this.cleanup(inputPath, outputPath);
                        resolve(buffer);
                    })
                    .on('error', async (err) => {
                        await this.cleanup(inputPath, outputPath);
                        reject(err);
                    });
            });
        } catch (error) {
            await this.cleanup(inputPath, outputPath);
            throw error;
        }
    }

    /**
     * Get media info
     */
    async getMediaInfo(inputBuffer) {
        const inputPath = path.join(this.tempDir, `input_${Date.now()}.media`);

        try {
            await writeFile(inputPath, inputBuffer);

            return new Promise((resolve, reject) => {
                ffmpeg.ffprobe(inputPath, async (err, metadata) => {
                    await this.cleanup(inputPath);
                    if (err) return reject(err);
                    resolve(metadata);
                });
            });
        } catch (error) {
            await this.cleanup(inputPath);
            throw error;
        }
    }

    /**
     * Resize image using ImageMagick
     */
    async resizeImage(inputBuffer, width, height) {
        const inputPath = path.join(this.tempDir, `input_${Date.now()}.jpg`);
        const outputPath = path.join(this.tempDir, `output_${Date.now()}.jpg`);

        try {
            await writeFile(inputPath, inputBuffer);

            return new Promise((resolve, reject) => {
                gm(inputPath)
                    .resize(width, height)
                    .write(outputPath, async (err) => {
                        if (err) {
                            await this.cleanup(inputPath, outputPath);
                            return reject(err);
                        }
                        const buffer = fs.readFileSync(outputPath);
                        await this.cleanup(inputPath, outputPath);
                        resolve(buffer);
                    });
            });
        } catch (error) {
            await this.cleanup(inputPath, outputPath);
            throw error;
        }
    }

    /**
     * Add watermark to image
     */
    async addWatermark(inputBuffer, watermarkText) {
        const inputPath = path.join(this.tempDir, `input_${Date.now()}.jpg`);
        const outputPath = path.join(this.tempDir, `output_${Date.now()}.jpg`);

        try {
            await writeFile(inputPath, inputBuffer);

            return new Promise((resolve, reject) => {
                gm(inputPath)
                    .font('Arial', 36)
                    .fill('#FFFFFF')
                    .gravity('SouthEast')
                    .drawText(10, 10, watermarkText)
                    .write(outputPath, async (err) => {
                        if (err) {
                            await this.cleanup(inputPath, outputPath);
                            return reject(err);
                        }
                        const buffer = fs.readFileSync(outputPath);
                        await this.cleanup(inputPath, outputPath);
                        resolve(buffer);
                    });
            });
        } catch (error) {
            await this.cleanup(inputPath, outputPath);
            throw error;
        }
    }

    /**
     * Convert image format
     */
    async convertImage(inputBuffer, outputFormat = 'png') {
        const inputPath = path.join(this.tempDir, `input_${Date.now()}.img`);
        const outputPath = path.join(this.tempDir, `output_${Date.now()}.${outputFormat}`);

        try {
            await writeFile(inputPath, inputBuffer);

            return new Promise((resolve, reject) => {
                gm(inputPath)
                    .setFormat(outputFormat)
                    .write(outputPath, async (err) => {
                        if (err) {
                            await this.cleanup(inputPath, outputPath);
                            return reject(err);
                        }
                        const buffer = fs.readFileSync(outputPath);
                        await this.cleanup(inputPath, outputPath);
                        resolve(buffer);
                    });
            });
        } catch (error) {
            await this.cleanup(inputPath, outputPath);
            throw error;
        }
    }

    /**
     * Cleanup temporary files
     */
    async cleanup(...files) {
        for (const file of files) {
            try {
                if (file && fs.existsSync(file)) {
                    await unlink(file);
                }
            } catch (error) {
                // Ignore cleanup errors
            }
        }
    }
}

module.exports = new MediaProcessor();