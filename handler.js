'use strict';
const path = require('path');
const fs = require('fs-extra');
const mime = require('mime-types');
const handleFormData = require('./handleFormData');
const spawn = require('./spawnProcessPromise');

const TMP_DIR = process.env.IS_OFFLINE ? './tmp' : '/tmp';
const FFMPEGPATH = process.env.IS_OFFLINE ? 'ffmpeg' : '/opt/ffmpeg/ffmpeg';
const FONT_FILE = process.env.IS_OFFLINE ? 'C\\:\\\\Windows\\\\Fonts\\\\calibri.ttf' : '/opt/ffmpeg/Calibri.ttf';

module.exports.process = async event => {
  const UID = event.requestContext.requestId;
  // const IP = event.requestContext.identity.sourceIp;
  const time = new Date().toLocaleString('en-US', { timeZone: 'UTC' }).replace(/:/g, '\\\:')
  const cwd = path.join(TMP_DIR, UID);

  try {
    const result = await handleFormData(event);
    
    // Upload media file
    await fs.mkdirs(cwd);
     
    // Get request data
    const media = result.media;
    if (!media) throw new Error('media required');

    // Decode base64
    const data = Buffer.from(media, 'base64');
    
    const ext = result.ext;
    if (!ext) throw new Error("ext required");

    fs.writeFileSync(`${cwd}/input.tmp`, data);
    
    const name = result.name ? result.name.replace(/:/g, '\\\:') : 'Oleg Tarlaganov';
    const dob = result.dob ? result.dob.replace(/:/g, '\\\:') : '04/08/1987';
    const ip = result.ip ? result.ip : event.requestContext.requestId;

    const fontsize = '(h/35)';

    const drawContent = (process.env.IS_OFFLINE) ? [
      'drawbox=x=0:y=0:w=in_w:h=(in_h/10):color=gray@0.3:t=fill',
      `drawtext=text='${name}':x=10:y=10:fontfile='${FONT_FILE}':fontcolor=white:fontsize=${fontsize}`,
      `drawtext=text='Uploaded\\\: ${time}':x=(main_w-text_w-10):y=10:fontfile='${FONT_FILE}':fontcolor=white:fontsize=${fontsize}`,
      `drawtext=text='DOB\\\: ${dob}':x=10:y=(18+text_h):fontfile='${FONT_FILE}':fontcolor=white:fontsize=${fontsize}`,
      `drawtext=text='IP\\\: ${ip}':x=(main_w-text_w-10):y=(18+text_h):fontfile='${FONT_FILE}':fontcolor=white:fontsize=${fontsize}`
    ] : [
      'drawbox=x=0:y=0:w=in_w:h=in_h/10:color=gray@0.3:t=fill',
      `drawtext=text='${name}':x=10:y=10:fontfile='${FONT_FILE}':fontcolor=white:fontsize=${fontsize}`,
      `drawtext=text='Uploaded\\\: ${time}':x=main_w-text_w-10:y=10:fontfile='${FONT_FILE}':fontcolor=white:fontsize=${fontsize}`,
      `drawtext=text='DOB\\\: ${dob}':x=10:y=18+text_h:fontfile='${FONT_FILE}':fontcolor=white:fontsize=${fontsize}`,
      `drawtext=text='IP\\\: ${ip}':x=main_w-text_w-10:y=18+text_h:fontfile='${FONT_FILE}':fontcolor=white:fontsize=${fontsize}`
    ];
    
    const drawContentStr = process.env.IS_OFFLINE ? '"' + drawContent.join(',') + '"' : drawContent.join(',')

    const outputFile = `output.${ext}`;
    await spawn(
      FFMPEGPATH,
      [
          '-i', 'input.tmp',
          '-filter_complex',
          drawContentStr,
          outputFile
      ],
      cwd
    );
    
    const file = await fs.readFile(`${cwd}/${outputFile}`);

    await fs.rmdir(cwd, { recursive: true });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        'Content-Type': mime.lookup(`${cwd}/${outputFile}`),
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
