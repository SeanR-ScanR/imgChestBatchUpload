const fs = require("fs");
const { openAsBlob } = require("node:fs");
const dotenv = require("dotenv");
let _ = require("lodash");
const { title } = require("process");

dotenv.config();

const comickFolder =
  "C:/Users/lucas/OneDrive/Documents/Suwayomi/downloads/mangas/Comick (FR)/";

const serie = "TEST";

const postRoute = "https://api.imgchest.com/v1/post";

const addPost = (id) => `https://api.imgchest.com/v1/post/${id}/add`;

const main = async () => {
  const mainFolderPath = `${comickFolder}${serie}`;
  const mainFolder = fs.readdirSync(mainFolderPath);
  const allChapter = mainFolder.forEach(async (folder) => {
    const regex = folder.match(
      "([^_]+)_(Vol. ([0-9]+), )?(Ch.|Chapter) ([0-9.]+)_(.*)"
    );
    const chapitre = {
      folder: `${mainFolderPath}/${folder}`,
      name: regex[6].trim(),
      chapitre: regex[5],
      volume: regex[3],
      teams: regex[1],
    };

    const chapterFolder = fs.readdirSync(chapitre.folder);
    const allImage = chapterFolder
      .filter((imageName) => !imageName.endsWith(".xml"))
      .map((imageName) => ({
        fullPath: `${chapitre.folder}/${imageName}`,
        filename: imageName,
      }));

    const chunks = _.chunk(allImage, 20);

    const batch = chunks.shift();

    const form = new FormData();
    form.append("title", `${title} Chap ${chapitre.chapitre} ${chapitre.name}`);
    form.append("nsfw", true);

    for (const img of batch) {
      form.append("images[]", await openAsBlob(img.fullPath), img.filename);
    }

    const response = await fetch(postRoute, {
      method: "POST",
      body: JSON.stringify(form),
      headers: {
        Authorization: `Bearer ${process.env.IMG_CHEST_TOKEN}`,
      },
    });
    console.log(response);
  });
};

main();
