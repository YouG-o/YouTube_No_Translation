
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src/content');
const outDir = path.join(__dirname, '../dist/content/scripts');

const scripts = [
  'scripts/getChannelIdScript.js',
  'titles/mainTitleScript.js',
  'titles/TitlesInnerTube.js',
  'audio/audioScript.js',
  'description/descriptionScript.js',
  'description/timestampScript.js',
  'description/searchDescriptionInnerTube.js',
  'subtitles/subtitlesScript.js',
  'channel/channelNameScript.js',
  'channel/ChannelNameInnerTubeScript.js',
  'channel/ChannelDescriptionInnerTube.js'
];

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

Promise.all(
  scripts.map(async (relPath) => {
    const src = path.join(srcDir, relPath);
    const out = path.join(outDir, path.basename(relPath));
    await esbuild.build({
      entryPoints: [src],
      bundle: true,
      platform: 'browser',
      format: 'iife',
      outfile: out,
      logLevel: 'info'
    });
    console.log(`Bundled: ${src} -> ${out}`);
  })
).catch((err) => {
  console.error(err);
  process.exit(1);
});