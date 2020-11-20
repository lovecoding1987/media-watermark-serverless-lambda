const Busboy = require('busboy');

const handleFormData = (event) => {
  return new Promise((resolve, reject) => {
    const busboy = new Busboy({
      headers: {
        ...event.headers,
        "content-type":
          event.headers["Content-Type"] || event.headers["content-type"],
      },
    });

    const result = {
      medias: [],
    };

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      file.on("data", (data) => {
        if (!(mimetype.startsWith("image/") || mimetype.startsWith("video/"))) return;
        result.medias.push({
          file: data,
          fileName: filename,
          contentType: mimetype,
        });
      });
    });
    busboy.on("field", (fieldname, value) => {
      try {
        result[fieldname] = JSON.parse(value);
      } catch (err) {
        result[fieldname] = value;
      }
    });
    busboy.on("error", (error) => reject(`Parse error: ${error}`));
    busboy.on("finish", () => {
      resolve(result);
    });
    busboy.write(event.body, event.isBase64Encoded ? "base64" : "binary");
    busboy.end();
  });
};

module.exports = handleFormData;
