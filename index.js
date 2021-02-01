const fs = require("fs");
const cheerio = require("cheerio");
const fetch = require("node-fetch");
const express = require("express");

const application = express();

application.get("/", function(request, response) {
  response.end("<a href='/partinfo?query=xm319'>xm-319</a>");
});

fs.exists("local/session", function(exists) {
  if (exists) {
    fs.readFile("local/session", function(error, data) {
      if (error) {
        return console.error(error);
      }

      const doRequest = createRequestor(data.toString());
      console.log("Session exists!");

      application.get("/partinfo", function(request, response) {
        doRequest(request.query.query, request.query.manufacturer)
          .then(getPartInfo)
          .then(result => response.status(200).send({ result }));
      });

      application.listen(8080);
      console.log("Server started!");
    });
  }
});

function getPartInfo(body) {
  const $ = cheerio.load(body);
  const headline = $("h2").first().text();

  if (/результат поиска/gi.test(headline)) {
    return $("h3").first().text();
  }

  return $("td.name a").map(function() {
    return [$(this).text(), $(this).attr("href")];
  }).get()
  .map((_, index, array) => [...array].splice(index * 2, 2))
  .filter(array => array.length > 0)
  .map(record => [record[0], record[1].split('&mft=')[1]]);
}

function createRequestor(cookie) {
  const root = "https://japancars.ru/index.php?route=product/search&pn=";

  return function(query, manufacturer) {
    const url = manufacturer ? 
      `${root}${query}&mft=${manufacturer}` : 
      `${root}${query}`;

    const options = {
      credentials: 'include',
      headers: { cookie }
    };

    return fetch(url, options).then(response => response.text());
  }
}
