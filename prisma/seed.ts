import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed learn languages
  const english = await prisma.language.upsert({
    where: { code: "en" },
    update: {},
    create: { code: "en", name: "English" },
  });

  const chinese = await prisma.language.upsert({
    where: { code: "zh" },
    update: {},
    create: { code: "zh", name: "Chinese" },
  });

  console.log("Languages seeded:", english.name, chinese.name);

  // Seed default teacher
  const passwordHash = await bcrypt.hash("teacher123", 10);
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@vc-class.com" },
    update: {},
    create: {
      email: "teacher@vc-class.com",
      name: "Default Teacher",
      passwordHash,
      role: "TEACHER",
      status: "ACTIVE",
    },
  });

  console.log("Teacher seeded:", teacher.email);

  // Seed sample topics
  const parkTopic = await prisma.topic.upsert({
    where: { id: "sample-topic-park" },
    update: {},
    create: {
      id: "sample-topic-park",
      title: "At the Park",
      description: "Learn vocabulary about things you find at the park",
      languageId: english.id,
      createdById: teacher.id,
    },
  });

  // Seed sample vocabulary for park topic
  const parkWords = [
    { word: "Swing", meaning: "A seat hung from ropes or chains for swinging", example: "The children love to play on the swing." },
    { word: "Slide", meaning: "A structure with a smooth slope for sliding down", example: "She went down the slide very fast." },
    { word: "Bench", meaning: "A long seat for several people", example: "We sat on the bench and watched the ducks." },
    { word: "Fountain", meaning: "A structure that sends water into the air", example: "The fountain in the park is very beautiful." },
    { word: "Path", meaning: "A way or track for walking", example: "We walked along the path through the trees." },
    { word: "Pond", meaning: "A small body of still water", example: "There are fish in the pond." },
    { word: "Grass", meaning: "Green plants covering the ground", example: "The children played on the grass." },
    { word: "Tree", meaning: "A tall plant with a trunk and branches", example: "We had a picnic under the tree." },
  ];

  for (let i = 0; i < parkWords.length; i++) {
    await prisma.vocabulary.upsert({
      where: { id: `sample-vocab-park-${i}` },
      update: {},
      create: {
        id: `sample-vocab-park-${i}`,
        ...parkWords[i],
        topicId: parkTopic.id,
        sortOrder: i,
      },
    });
  }

  console.log("Sample topic seeded:", parkTopic.title, `(${parkWords.length} words)`);

  // Seed "At the Countryside" topic
  const countrysideTopic = await prisma.topic.upsert({
    where: { id: "sample-topic-countryside" },
    update: {},
    create: {
      id: "sample-topic-countryside",
      title: "At the Countryside",
      description: "Learn vocabulary about rural life, farms, and nature in the countryside",
      languageId: english.id,
      createdById: teacher.id,
    },
  });

  const countrysideWords = [
    { word: "Barn", meaning: "A large farm building used for storing crops or housing animals", example: "The farmer keeps hay in the barn." },
    { word: "Fence", meaning: "A barrier made of wood or wire enclosing an area", example: "The fence keeps the sheep from wandering off." },
    { word: "Harvest", meaning: "The process of gathering ripe crops from the fields", example: "The harvest begins in early autumn." },
    { word: "Meadow", meaning: "A field of grass, often used for hay or grazing", example: "The cows graze in the meadow every morning." },
    { word: "Orchard", meaning: "A piece of land planted with fruit trees", example: "We picked apples from the orchard." },
    { word: "Scarecrow", meaning: "A figure set up to scare birds away from crops", example: "The scarecrow stands in the middle of the cornfield." },
    { word: "Tractor", meaning: "A powerful vehicle used on farms for pulling equipment", example: "The farmer drives the tractor across the field." },
    { word: "Stream", meaning: "A small narrow river", example: "We crossed the stream using stepping stones." },
    { word: "Hay", meaning: "Grass that has been cut and dried for animal feed", example: "The horses eat hay during winter." },
    { word: "Rooster", meaning: "An adult male chicken", example: "The rooster crows at dawn every morning." },
    { word: "Crop", meaning: "A plant grown in large quantities for food or profit", example: "Wheat is the main crop in this region." },
    { word: "Windmill", meaning: "A structure that uses wind power to grind grain or pump water", example: "The old windmill still turns when the wind blows." },
    { word: "Stable", meaning: "A building where horses are kept", example: "The horses return to the stable at night." },
    { word: "Plough", meaning: "A farming tool used to turn over soil before planting", example: "The farmer uses a plough to prepare the field." },
    { word: "Countryside", meaning: "The land and scenery of a rural area", example: "Life in the countryside is peaceful and quiet." },
  ];

  for (let i = 0; i < countrysideWords.length; i++) {
    await prisma.vocabulary.upsert({
      where: { id: `sample-vocab-countryside-${i}` },
      update: {},
      create: {
        id: `sample-vocab-countryside-${i}`,
        ...countrysideWords[i],
        topicId: countrysideTopic.id,
        sortOrder: i,
      },
    });
  }

  console.log("Sample topic seeded:", countrysideTopic.title, `(${countrysideWords.length} words)`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
