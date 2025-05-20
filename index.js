import fs from "fs";
import dotenv from "dotenv";
import axios from "axios";
import _ from "lodash";
import FormData from "form-data";
import axiosRateLimit from "axios-rate-limit";

global.FormData = FormData;
dotenv.config();

const comickFolder =
  "C:/Users/lucas/OneDrive/Documents/Suwayomi/downloads/mangas/Comick (FR)/";

const serie = "RuriDragon";

const postRoute = "https://api.imgchest.com/v1/post";

const addPostRoute = (id) => `https://api.imgchest.com/v1/post/${id}/add`;

const http = axiosRateLimit(axios.create(), {
  maxRequests: 30,
  perMilliseconds: 60000,
});

const main = async () => {
  const json = JSON.parse(
    fs.readFileSync("./template.json", { encoding: "UTF-8" })
  );
  const mainFolderPath = `${comickFolder}${serie}`;
  const mainFolder = fs.readdirSync(mainFolderPath);
  const promise = mainFolder.map(async (folder) => {
    const regex = folder.match(
      "([^_]+)_(Vol. (\\d+), )?(Ch.|Chapter) ([0-9\\.]+)(_(.*))?"
    );
    const chapitre = {
      folder: `${mainFolderPath}/${folder}`,
      name: regex[7]?.trim() ?? regex[5],
      chapitre: regex[5],
      volume: regex[3],
      teams: regex[1],
    };

    const chapterFolder = fs.readdirSync(chapitre.folder);
    const allImage = fs
      .readdirSync(chapitre.folder)
      .filter((n) => !n.endsWith(".xml"))
      .map((n) => ({
        stream: fs.createReadStream(`${chapitre.folder}/${n}`),
        filename: n,
      }));

    const chuncks = _.chunk(allImage, 20);

    const batch = chuncks.shift();
    const form = new FormData();
    form.append("title", `${serie} Chap ${chapitre.chapitre} ${chapitre.name}`);
    form.append("nsfw", "true");
    batch.forEach(({ stream, filename }) => {
      form.append("images[]", stream, filename);
    });

    const response = await http.post(postRoute, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${process.env.IMG_CHEST_TOKEN}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const jsonPost = response.data;
    console.log(
      `\n==============================================================================\nCREATE POST ${serie} ${chapitre.chapitre}`
    );
    console.log(response.status, response.data);

    const id = jsonPost.data.id;
    for (let chunk of chuncks) {
      const addImageForm = new FormData();
      chunk.forEach(({ stream, filename }) => {
        addImageForm.append("images[]", stream, filename);
      });

      const addImageResponse = await http.post(addPostRoute(id), addImageForm, {
        headers: {
          ...addImageForm.getHeaders(),
          Authorization: `Bearer ${process.env.IMG_CHEST_TOKEN}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      console.log(
        `\n-----------------------------------------------------------------------------\nADD IMAGE ${serie} ${chapitre.chapitre}`
      );
      console.log(addImageResponse.status, addImageResponse.data);
    }
    json.chapters[chapitre.chapitre] = {
      title: chapitre.name,
      volume: chapitre?.volume ?? "",
      last_updated: Date.now(),
      groups: {
        [chapitre.teams]: `/proxy/api/imgchest/chapter/${id}`,
      },
    };
  });
  await Promise.all(promise);
  fs.writeFileSync(
    `./${serie.replaceAll(/\s/g, "_")}.json`,
    JSON.stringify(json, null, "\t")
  );
};

main();
