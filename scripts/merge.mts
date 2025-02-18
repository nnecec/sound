import type { TracksConfig } from '../src'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { tracks } from '../example/data'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
ffmpeg.setFfmpegPath(ffmpegPath!)

const __filename = fileURLToPath(import.meta.url) // get the resolved path to the file
const __dirname = path.dirname(__filename)

export async function merge(
  tracks: TracksConfig,
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let command = ffmpeg()

    // 添加所有音轨
    tracks.forEach((track) => {
      command = command.input(path.join(__dirname, '../public', track.src))
    })

    // 构建复杂的 filter_complex 命令
    const filterCommands: string[] = tracks.map((track, index) => {
      const filters: string[] = []

      // 时间偏移
      filters.push(
        `adelay=${Math.round(track.startTime * 1000)}|${Math.round(track.startTime * 1000)}`,
      )

      // 音量控制
      if (track.volume !== undefined) {
        filters.push(`volume=${track.volume}`)
      }

      // 淡入淡出效果
      if (track.fadeInDuration) {
        filters.push(
          `afade=t=in:st=${track.startTime}:d=${track.fadeInDuration}`,
        )
      }
      if (track.fadeOutDuration) {
        filters.push(
          `afade=t=out:st=${track.endTime - track.fadeOutDuration}:d=${track.fadeOutDuration}`,
        )
      }

      return `[${index}:a]${filters.join(',')}[a${index}]`
    })

    // 混音命令
    const mixCommand =
      tracks.map((_, index) => `[a${index}]`).join('') +
      `amix=inputs=${tracks.length}:duration=longest:dropout_transition=0:normalize=0[amixed]` +
      ';[amixed]volume=2[aout]'

    command
      .complexFilter([...filterCommands, mixCommand])
      .map('[aout]')
      .on('error', reject)
      .on('end', resolve)
      .save(outputPath)
  })
}

merge(tracks, './output.mp3').then((data) => {
  console.log('🚀 ~ merge ~ data:', data)
})
