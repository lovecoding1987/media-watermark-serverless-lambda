'use strict';
const path = require('path');
const fs = require('fs-extra');
const handleFormData = require('./handleFormData');
const spawn = require('./spawnProcessPromise');

const TMP_DIR = process.env.IS_OFFLINE ? './tmp' : '/tmp';
const FFMPEGPATH = process.env.IS_OFFLINE ? 'ffmpeg' : '/opt/ffmpeg/ffmpeg';

module.exports.process = async event => {
  const UID = event.requestContext.requestId;
  const IP = event.requestContext.identity.sourceIp;
  const time = new Date().toLocaleString('en-US', { timeZone: 'UTC' }).replace(/:/g, '\\:')
  const cwd = path.join(TMP_DIR, UID);

  try {
    const result = await handleFormData(event);
    
    // Upload media file
    await fs.mkdirs(cwd);
    const media = result.medias[0];
    fs.writeFileSync(`${cwd}/${media.fileName}`, media.file);
     
    // Get request data
    const name = result.name ? result.name.replace(/:/g, '\\:') : 'Oleg Tarlaganov';
    const dob = result.dob ? result.dob.replace(/:/g, '\\:') : '04/08/1987';

    const fontsize = '(h/35)';

    const drawContent = [
      "drawbox=x=0:y=0:w=in_w:h=in_h/10:color=white@0.1:t=fill",
      `drawtext=text='${name}':x=10:y=10:fontfile=/opt/ffmpeg/FreeSerif.ttf:fontcolor=white:fontsize=${fontsize}`,
      `drawtext=text='Uploaded\\:${time}':x=(main_w-text_w-10):y=10:fontfile=/opt/ffmpeg/FreeSerif.ttf:fontcolor=white:fontsize=${fontsize}`,
      `drawtext=text='DOB\\:${dob}':x=10:y=(15+text_h):fontfile=/opt/ffmpeg/FreeSerif.ttf:fontcolor=white:fontsize=${fontsize}`,
      `drawtext=text='IP\\:${IP}':x=(main_w-text_w-10):y=(15+text_h):fontfile=/opt/ffmpeg/FreeSerif.ttf:fontcolor=white:fontsize=${fontsize}`
    ];

    const outputFilename = `${path.parse(media.fileName).name}_m${path.parse(media.fileName).ext}`
    
    await spawn(
      FFMPEGPATH,
      [
          '-i', media.fileName,
          '-vf',
          `"${drawContent.join(',')}"`,
          outputFilename
      ],
      cwd
    );
    
    const file = await fs.readFile(`${cwd}/${outputFilename}`);

    await fs.rmdir(cwd, { recursive: true });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': media.contentType,
      },
      body: file.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error(err)
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'applications/json',
      },
      body: JSON.stringify({
        message: 'Failed'
      })
    }
  }
};
