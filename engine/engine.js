const readline = require('readline');
const distribution = require('../distribution');
const id = distribution.util.id;
// const { embed } = require('../distribution/local');
global.nodeConfig = { ip: "127.0.0.1", port: 7080 };
const groupsTemplate = require("../distribution/all/groups");

const crawlGroup = {};

let localServer = null;

const n1 = { ip: "127.0.0.1", port: 7110 };
const n2 = { ip: "127.0.0.1", port: 7111 };
const n3 = { ip: "127.0.0.1", port: 7112 };

crawlGroup[id.getSID(n1)] = n1;
crawlGroup[id.getSID(n2)] = n2;
crawlGroup[id.getSID(n3)] = n3;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion() {
  console.log('--------------------------------------------------------------');
  rl.question('Enter a search query: ', (query) => {
    const vecStore = distribution.crawl.vecStore;
    if (query.toLowerCase() == 'halt') {
      rl.close();
      localServer.close()
    } else {
      vecStore.query(query.toLowerCase().split(' '), (e, v) => {
        if (e) {
          console.log(e);
        } else {
          console.log(v);
        }
        askQuestion();
      });
    }
  });
}

distribution.node.start((server) => {
  localServer = server;

  const crawlConfig = { gid: "crawl" };
  groupsTemplate(crawlConfig).put("crawl", crawlGroup, (e, v) => {
    askQuestion();
  });
});

    // distribution.crawl.vecStore.put(d1.url, d1.vec, (e, v) => {
    //   distribution.crawl.vecStore.put(d2.url, d2.vec, (e, v) => {
    //     distribution.crawl.vecStore.put(d3.url, d3.vec, (e, v) => {
    //       distribution.crawl.vecStore.put(d4.url, d4.vec, (e, v) => {
    //         distribution.crawl.vecStore.put(d5.url, d5.vec, (e, v) => {
    //           distribution.crawl.vecStore.put(d6.url, d6.vec, (e, v) => {
    //             distribution.crawl.vecStore.put(d7.url, d7.vec, (e, v) => {
    //               distribution.crawl.vecStore.put(d8.url, d8.vec, (e, v) => {
    //                 distribution.crawl.vecStore.put(d9.url, d9.vec, (e, v) => {
    //                   distribution.crawl.vecStore.put(d10.url, d10.vec, (e, v) => {
    //                     askQuestion();
    //                   });
    //                 });
    //               });
    //             });
    //           });
    //         });
    //       });
    //     });
    //   });
    // });



// t1 = 'Rome (Italian and Latin: Roma, Italian: [ˈroːma] ⓘ) is the capital city of Italy. It is also the capital of the Lazio region, the centre of the Metropolitan City of Rome Capital, and a special comune (municipality) named Comune di Roma Capitale. With 2,860,009 residents in 1,285 km2 (496.1 sq mi), Rome is the country most populated comune and the third most populous city in the European Union by population within city limits. The Metropolitan City of Rome, with a population of 4,355,725 residents, is the most populous metropolitan city in Italy. Its metropolitan area is the third-most populous within Italy. Rome is located in the central-western portion of the Italian Peninsula, within Lazio Latium, along the shores of the Tiber. Vatican City the smallest country in the world is an independent country inside the city boundaries of Rome, the only existing example of a country within a city. Rome is often referred to as the City of Seven Hills due to its geographic location, and also as the "Eternal City". Rome is generally considered to be the cradle of Western civilization and Western Christian culture, and the centre of the Catholic Church.';
// d1 = {
//   url: 'https://en.wikipedia.org/wiki/Rome', 
//   vec: embed(t1.toLowerCase().split(' ')),
// };
// t2 = 'In modern historiography, ancient Rome encompasses the founding of the Italian city of Rome in the 8th century BC, the Roman Kingdom (753–509 BC), Roman Republic (509–27 BC), Roman Empire (27 BC– 395 AD), and the collapse of the Western Roman Empire in the 5th century AD. Ancient Rome began as an Italic settlement, traditionally dated to 753 BC, beside the River Tiber in the Italian Peninsula.';
// d2 = {
//   url:'https://en.wikipedia.org/wiki/Ancient_Rome',
//   vec: embed(t2.toLowerCase().split(' ')),
// };
// t3 = 'Greece,[a] officially the Hellenic Republic, is a country in Southeast Europe. Located on the southern tip of the Balkan peninsula, Greece shares land borders with Albania to the northwest, North Macedonia and Bulgaria to the north, and Turkey to the east. The Aegean Sea lies to the east of the mainland, the Ionian Sea to the west, and the Sea of Crete and the Mediterranean Sea to the south. Greece has the longest coastline on the Mediterranean Basin, featuring thousands of islands. The country comprises nine traditional geographic regions, and has a population of nearly 10.4 million. Athens is the nation capital and largest city, followed by Thessaloniki and Patras.';
// d3 = {
//   url: 'https://en.wikipedia.org/wiki/Greece',
//   vec: embed(d3.toLowerCase().split(' ')),
// };
// t4 = 'The marathon (from Greek Μαραθώνιος) is a long-distance foot race with a distance of 42.195 km (26 mi 385 yd), usually run as a road race, but the distance can be covered on trail routes. The marathon can be completed by running or with a run/walk strategy. There are also wheelchair divisions. More than 800 marathons are held throughout the world each year, with the vast majority of competitors being recreational athletes, as larger marathons can have tens of thousands of participants. The marathon was one of the original modern Olympic events in 1896. The distance did not become standardized until 1921. The distance is also included in the World Athletics Championships, which began in 1983. It is the only running road race included in both championship competitions walking races on the roads are also contested in both.';
// d4 = {
//   url: 'https://en.wikipedia.org/wiki/Marathon',
//   vec: embed(d4.toLowerCase().split(' ')),
// };
// t5 = 'Pizza (/ˈpiːtsə/ PEET-sə, Italian: [ˈpittsa]; Neapolitan: [ˈpittsə]) is an Italian dish consisting of a flat base of leavened wheat-based dough topped with tomato, cheese, and other ingredients, baked at a high temperature, traditionally in a wood-fired oven. The term pizza was first recorded in the year 997 AD, in a Latin manuscript from the southern Italian town of Gaeta, in Lazio, on the border with Campania. Raffaele Esposito is often credited for creating modern pizza in Naples. In 2009, Neapolitan pizza was registered with the European Union as a traditional speciality guaranteed dish. In 2017, the art of making Neapolitan pizza was added to UNESCO list of intangible cultural heritage.';
// d5 = {
//   url: 'https://en.wikipedia.org/wiki/Pizza',
//   vec: embed(t5.toLowerCase().split(' ')),
// };
// t6 ='Brown University is a private Ivy League research university in Providence, Rhode Island. It is the seventh-oldest institution of higher education in the United States, founded in 1764 as the College in the English Colony of Rhode Island and Providence Plantations. One of nine colonial colleges chartered before the American Revolution, it was the first college in the United States to codify in its charter that admission and instruction of students was to be equal regardless of their religious affiliation. The university is home to the oldest applied mathematics program in the United States, the oldest engineering program in the Ivy League, and the third-oldest medical program in New England. It was one of the early doctoral-granting U.S. institutions in the late 19th century, adding masters and doctoral studies in 1887. In 1969, it adopted its Open Curriculum after a period of student lobbying, which eliminated mandatory general education distribution requirements. In 1971, Brown coordinate women institution, Pembroke College, was fully merged into the university.';
// d6 = {
//   url: 'https://en.wikipedia.org/wiki/Brown_University',
//   vec: embed(t6.toLowerCase().split(' ')),
// };
// t7 = 'Computer science is the study of computation, information, and automation. Computer science spans theoretical disciplines such as algorithms, theory of computation, and information theory to applied disciplines including the design and implementation of hardware and software. Though more often considered an academic discipline, computer science is closely related to computer programming.'
// d7 = {
//   url: 'https://en.wikipedia.org/wiki/Computer_science',
//   vec: embed(t7.toLowerCase().split(' ')),
// };
// t8 = 'Social science is one of the branches of science, devoted to the study of societies and the relationships among individuals within those societies. The term was formerly used to refer to the field of sociology, the original "science of society", established in the 18th century. In addition to sociology, it now encompasses a wide array of academic disciplines, including anthropology, archaeology, economics, human geography, linguistics, management science, communication science, psychology and political science. Positivist social scientists use methods resembling those used in the natural sciences as tools for understanding societies, and so define science in its stricter modern sense. Interpretivist or speculative social scientists, by contrast, may use social critique or symbolic interpretation rather than constructing empirically falsifiable theories, and thus treat science in its broader sense. In modern academic practice, researchers are often eclectic, using multiple methodologies (for instance, by combining both quantitative and qualitative research). The term social research has also acquired a degree of autonomy as practitioners from various disciplines share similar goals and methods.';
// d8 = {
//   url: 'https://en.wikipedia.org/wiki/Social_science',
//   vec: embed(t8.toLowerCase().split(' ')),
// };
// t9 = 'Classical music generally refers to the art music of the Western world, considered to be distinct from Western folk music or popular music traditions. It is sometimes distinguished as Western classical music, as the term "classical music" can also be applied to non-Western art musics. Classical music is often characterized by formality and complexity in its musical form and harmonic organization,[1] particularly with the use of polyphony. Since at least the ninth century it has been primarily a written tradition, spawning a sophisticated notational system, as well as accompanying literature in analytical, critical, historiographical, musicological and philosophical practices. A foundational component of Western culture, classical music is frequently seen from the perspective of individual or groups of composers, whose compositions, personalities and beliefs have fundamentally shaped its history.';
// d9 = {
//   url: 'https://en.wikipedia.org/wiki/Classical_music',
//   vec: embed(t9.toLowerCase().split(' ')),
// };
// t10 = 'There are many references to a sliding or gliding dance, including volte, that would evolve into the waltz that date from 16th-century Europe, including the representations of the printmaker Hans Sebald Beham. The French philosopher Michel de Montaigne wrote of a dance he saw in 1580 in Augsburg, where the dancers held each other so closely that their faces touched. Kunz Haas of approximately the same period wrote, "Now they are dancing the godless Weller or Spinner." "The vigorous peasant dancer, following an instinctive knowledge of the weight of fall, uses his surplus energy to press all his strength into the proper beat of the bar, thus intensifying his personal enjoyment in dancing." Around 1750, the lower classes in the regions of Bavaria, Tyrol, and Styria began dancing a couples dance called Walzer. The Ländler, also known as the Schleifer, a country dance in 3 4 time, was popular in Bohemia, Austria, and Bavaria, and spread from the countryside to the suburbs of the city. While the eighteenth-century upper classes continued to dance the minuets (such as those by Mozart, Haydn and Handel), bored noblemen slipped away to the balls of their servants.';
// d10 = {
//   url: 'https://en.wikipedia.org/wiki/Waltz',
//   vec: embed(t10.toLowerCase().split(' ')),
// };