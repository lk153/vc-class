import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// Load .env.local
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
const needsSsl = rawUrl.includes("sslmode=") || rawUrl.includes("supabase.com");
const connectionString = rawUrl
  .replace(/[?&]sslmode=[^&]*/g, "")
  .replace(/\?&/, "?")
  .replace(/\?$/, "");

const adapter = new PrismaPg({
  connectionString,
  ...(needsSsl && { ssl: { rejectUnauthorized: false } }),
});
const prisma = new PrismaClient({ adapter });

const passwordHash = "$2b$10$SIEvW/hwsXVf2C0ozyWR5.gPPxr4MQrE4pyFiPSCqMlSs1OVTc.86"; // teacher123

async function main() {
  console.log("Seeding database...\n");

  // ── Languages ──
  const english = await prisma.language.upsert({
    where: { code: "en" },
    update: {},
    create: { id: "cmmx56vz800008jwxj8ftsg8x", code: "en", name: "English" },
  });
  const chinese = await prisma.language.upsert({
    where: { code: "zh" },
    update: {},
    create: { id: "cmmx56vzi00018jwxhe913w95", code: "zh", name: "Chinese" },
  });
  console.log("✓ Languages:", english.name, chinese.name);

  // ── Users ──
  const teacherNga = await prisma.user.upsert({
    where: { email: "nga@teacher.com" },
    update: {},
    create: {
      id: "cmmx56w1d00028jwx5ms6b5jk",
      email: "nga@teacher.com",
      name: "Ms.Thien Nga",
      passwordHash,
      role: "TEACHER",
      status: "ACTIVE",
    },
  });
  const teacherViet = await prisma.user.upsert({
    where: { email: "viet@teacher.com" },
    update: {},
    create: {
      id: "cmmzq37he00007wwxg3ekxowv",
      email: "viet@teacher.com",
      name: "Mr. Quoc Viet",
      passwordHash,
      role: "TEACHER",
      status: "ACTIVE",
    },
  });
  const studentHang = await prisma.user.upsert({
    where: { email: "hang@stu.com" },
    update: {},
    create: {
      id: "cmmx9kmiz000445wxen4po1z1",
      email: "hang@stu.com",
      name: "Nguyen Hang",
      passwordHash,
      role: "STUDENT",
      status: "ACTIVE",
      learnLanguageId: english.id,
    },
  });
  const studentSon = await prisma.user.upsert({
    where: { email: "son@stu.com" },
    update: {},
    create: {
      id: "cmmypuble000hbuwxl2syzq16",
      email: "son@stu.com",
      name: "Thanh Son",
      passwordHash,
      role: "STUDENT",
      status: "ACTIVE",
      learnLanguageId: chinese.id,
    },
  });
  console.log("✓ Teachers:", teacherNga.name, teacherViet.name);
  console.log("✓ Students:", studentHang.name, studentSon.name);

  // ── Topics ──
  const parkTopic = await prisma.topic.upsert({
    where: { id: "sample-topic-park" },
    update: {},
    create: {
      id: "sample-topic-park",
      title: "At the Park",
      description: "Learn vocabulary about things you find at the park",
      languageId: english.id,
      createdById: teacherNga.id,
    },
  });
  const countrysideTopic = await prisma.topic.upsert({
    where: { id: "sample-topic-countryside" },
    update: {},
    create: {
      id: "sample-topic-countryside",
      title: "At the Countryside",
      description: "Learn vocabulary about rural life, farms, and nature in the countryside",
      languageId: english.id,
      createdById: teacherViet.id,
    },
  });
  const chineseTopic = await prisma.topic.upsert({
    where: { id: "cmmypxn0z000ibuwxoga9c42o" },
    update: {},
    create: {
      id: "cmmypxn0z000ibuwxoga9c42o",
      title: "這是一個測試",
      description: "通常用於台灣、香港和澳門。它保留了漢字的原始結構，字形結構較複雜，富有歷史和文化底蘊。閱讀繁體字能更深刻地體會中華文化的傳承",
      languageId: chinese.id,
      createdById: teacherNga.id,
    },
  });
  console.log("✓ Topics:", parkTopic.title, countrysideTopic.title, chineseTopic.title);

  // ── Vocabulary: Park ──
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
      create: { id: `sample-vocab-park-${i}`, ...parkWords[i], topicId: parkTopic.id, sortOrder: i },
    });
  }

  // ── Vocabulary: Countryside ──
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
    { word: "Buffalo", meaning: "The animal has 4 legs and help farmer to do works on green field", example: "The farmer has led buffalo go to his green field in the morning" },
  ];
  for (let i = 0; i < countrysideWords.length; i++) {
    await prisma.vocabulary.upsert({
      where: { id: i === 15 ? "cmn6zw83l00047w5cuhp4ggxp" : `sample-vocab-countryside-${i}` },
      update: {},
      create: {
        id: i === 15 ? "cmn6zw83l00047w5cuhp4ggxp" : `sample-vocab-countryside-${i}`,
        ...countrysideWords[i],
        topicId: countrysideTopic.id,
        sortOrder: i,
      },
    });
  }
  console.log("✓ Vocabulary: Park (8), Countryside (16)");

  // ── Practice Tests ──
  const parkTest = await prisma.practiceTest.upsert({
    where: { id: "cmmx7zspb000045wxgvczj85b" },
    update: {},
    create: {
      id: "cmmx7zspb000045wxgvczj85b",
      title: "Park - Test 1",
      topicId: parkTopic.id,
      createdById: teacherNga.id,
    },
  });
  const countrysideTest1 = await prisma.practiceTest.upsert({
    where: { id: "cmmzr7nv40014buwxbds49pao" },
    update: {},
    create: {
      id: "cmmzr7nv40014buwxbds49pao",
      title: "Countryside - Test 1",
      topicId: countrysideTopic.id,
      createdById: teacherNga.id,
    },
  });
  const countrysideTest2 = await prisma.practiceTest.upsert({
    where: { id: "trrzr7nv40014buwxbds49pai" },
    update: {},
    create: {
      id: "trrzr7nv40014buwxbds49pai",
      title: "Countryside - Test 2",
      topicId: countrysideTopic.id,
      createdById: teacherViet.id,
    },
  });
  console.log("✓ Practice Tests:", parkTest.title, countrysideTest1.title, countrysideTest2.title);

  // ── Questions: Park Test ──
  const parkQuestions = [
    { id: "cmmx7zspd000145wxpesmiotj", num: 1, content: "Is the sky blue?", type: "YES_NO" as const, a1: "Yes", a2: "No", a3: null, a4: null, correct: "Yes" },
    { id: "cmmx7zspd000245wx1p1q13fm", num: 2, content: "What color is grass?", type: "MULTIPLE_CHOICE" as const, a1: "Red", a2: "Blue", a3: "Green", a4: "Yellow", correct: "Green" },
    { id: "cmmx7zspd000345wxkmorftpa", num: 3, content: "The sun rises in the ___", type: "GAP_FILL" as const, a1: "east", a2: null, a3: null, a4: null, correct: "east" },
  ];
  for (const q of parkQuestions) {
    await prisma.question.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id, practiceTestId: parkTest.id, questionNumber: q.num, content: q.content,
        questionType: q.type, answer1: q.a1, answer2: q.a2, answer3: q.a3, answer4: q.a4,
        correctAnswer: q.correct, timer: 30,
      },
    });
  }

  // ── Questions: Countryside Test 1 (20 questions) ──
  const csQuestions = [
    { id: "cmmzr7nv60015buwx8p41htex", num: 1, content: "Is a barn used for storing crops or housing animals?", type: "YES_NO" as const, a1: "Yes", a2: "No", a3: null, a4: null, correct: "Yes" },
    { id: "cmmzr7nv60016buwxrjy30prm", num: 2, content: "What is a meadow?", type: "MULTIPLE_CHOICE" as const, a1: "A type of flower", a2: "A field of grass for hay or grazing", a3: "A small river", a4: "A farm building", correct: "A field of grass for hay or grazing" },
    { id: "cmmzr7nv60017buwx3xn3adi5", num: 3, content: "The farmer drives the ___ across the field.", type: "GAP_FILL" as const, a1: "tractor", a2: null, a3: null, a4: null, correct: "tractor" },
    { id: "cmmzr7nv60018buwxkippywss", num: 4, content: "What is the purpose of a scarecrow?", type: "MULTIPLE_CHOICE" as const, a1: "To water crops", a2: "To scare birds away from crops", a3: "To feed animals", a4: "To mark the farm boundary", correct: "To scare birds away from crops" },
    { id: "cmmzr7nv60019buwxm8vuepvf", num: 5, content: "Is a rooster an adult female chicken?", type: "YES_NO" as const, a1: "Yes", a2: "No", a3: null, a4: null, correct: "No" },
    { id: "cmmzr7nv6001abuwxyxuiurnc", num: 6, content: "A piece of land planted with fruit trees is called an ___.", type: "GAP_FILL" as const, a1: "orchard", a2: null, a3: null, a4: null, correct: "orchard" },
    { id: "cmmzr7nv6001bbuwxkcdl2lnj", num: 7, content: "What does a windmill use to grind grain or pump water?", type: "MULTIPLE_CHOICE" as const, a1: "Electricity", a2: "Water power", a3: "Wind power", a4: "Solar power", correct: "Wind power" },
    { id: "cmmzr7nv6001cbuwxltijnah6", num: 8, content: "The ___ keeps the sheep from wandering off.", type: "GAP_FILL" as const, a1: "fence", a2: null, a3: null, a4: null, correct: "fence" },
    { id: "cmmzr7nv6001dbuwxinu8jb3k", num: 9, content: "What is a stream?", type: "MULTIPLE_CHOICE" as const, a1: "A large lake", a2: "A small narrow river", a3: "A deep well", a4: "A wide ocean", correct: "A small narrow river" },
    { id: "cmmzr7nv6001ebuwx14eohzq7", num: 10, content: "Is hay used as animal feed?", type: "YES_NO" as const, a1: "Yes", a2: "No", a3: null, a4: null, correct: "Yes" },
    { id: "cmmzr7nv6001fbuwxn90dpp3x", num: 11, content: "Grass that has been cut and dried for animal feed is called ___.", type: "GAP_FILL" as const, a1: "hay", a2: null, a3: null, a4: null, correct: "hay" },
    { id: "cmmzr7nv6001gbuwxr83t7ozf", num: 12, content: "Where are horses kept at night?", type: "MULTIPLE_CHOICE" as const, a1: "In the barn", a2: "In the orchard", a3: "In the stable", a4: "In the meadow", correct: "In the stable" },
    { id: "cmmzr7nv6001hbuwxv27wxo3x", num: 13, content: "The harvest begins in early ___.", type: "GAP_FILL" as const, a1: "autumn", a2: null, a3: null, a4: null, correct: "autumn" },
    { id: "cmmzr7nv6001ibuwxfdq889mc", num: 14, content: "What is a plough used for?", type: "MULTIPLE_CHOICE" as const, a1: "Cutting trees", a2: "Turning over soil before planting", a3: "Watering crops", a4: "Feeding animals", correct: "Turning over soil before planting" },
    { id: "cmmzr7nv6001jbuwxpzoaspuh", num: 15, content: "Is the countryside known for being noisy and crowded?", type: "YES_NO" as const, a1: "Yes", a2: "No", a3: null, a4: null, correct: "No" },
    { id: "cmmzr7nv6001kbuwxi8owqelb", num: 16, content: "What is a crop?", type: "MULTIPLE_CHOICE" as const, a1: "A farm building", a2: "A type of fence", a3: "A plant grown in large quantities for food", a4: "A farming tool", correct: "A plant grown in large quantities for food" },
    { id: "cmmzr7nv6001lbuwxtc9lbgdd", num: 17, content: "The ___ crows at dawn every morning.", type: "GAP_FILL" as const, a1: "rooster", a2: null, a3: null, a4: null, correct: "rooster" },
    { id: "cmmzr7nv6001mbuwx23qvoqdf", num: 18, content: "We picked apples from the ___.", type: "GAP_FILL" as const, a1: "orchard", a2: null, a3: null, a4: null, correct: "orchard" },
    { id: "cmmzr7nv6001nbuwxhw01v4hw", num: 19, content: "What is a barn?", type: "MULTIPLE_CHOICE" as const, a1: "A small river", a2: "A large farm building for storing crops or housing animals", a3: "A field of grass", a4: "A piece of land with fruit trees", correct: "A large farm building for storing crops or housing animals" },
    { id: "cmmzr7nv6001obuwxy2s9fa7j", num: 20, content: "The old ___ still turns when the wind blows.", type: "GAP_FILL" as const, a1: "windmill", a2: null, a3: null, a4: null, correct: "windmill" },
  ];
  for (const q of csQuestions) {
    await prisma.question.upsert({
      where: { id: q.id },
      update: {},
      create: {
        id: q.id, practiceTestId: countrysideTest1.id, questionNumber: q.num, content: q.content,
        questionType: q.type, answer1: q.a1, answer2: q.a2, answer3: q.a3, answer4: q.a4,
        correctAnswer: q.correct, timer: 30,
      },
    });
  }
  console.log("✓ Questions: Park (3), Countryside (20)");

  // ── Class ──
  const engClass = await prisma.class.upsert({
    where: { id: "cmn5vbocb00007w5cgd0uqtav" },
    update: {},
    create: {
      id: "cmn5vbocb00007w5cgd0uqtav",
      name: "Intermediate English Communication",
      languageId: english.id,
      level: "B1",
      schedule: JSON.stringify([
        { day: "Monday", startTime: "20:00", endTime: "21:00" },
        { day: "Wednesday", startTime: "20:00", endTime: "21:00" },
        { day: "Friday", startTime: "20:00", endTime: "21:00" },
      ]),
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-05-01"),
      teacherId: teacherNga.id,
      maxStudents: 20,
      specialNotes: "Ms.Nga's class teaches English. Be on time!",
      status: "SCHEDULING",
    },
  });
  console.log("✓ Class:", engClass.name);

  // ── Enrollments ──
  for (const studentId of [studentHang.id, studentSon.id]) {
    await prisma.classEnrollment.upsert({
      where: { classId_userId: { classId: engClass.id, userId: studentId } },
      update: {},
      create: { classId: engClass.id, userId: studentId },
    });
  }
  console.log("✓ Enrollments: 2 students in class");

  // ── Topic Assignment (class-level) ──
  await prisma.topicAssignment.upsert({
    where: { classId_topicId: { classId: engClass.id, topicId: parkTopic.id } },
    update: {},
    create: { id: "cmn5vl0ce00037w5ck8zr3egi", classId: engClass.id, topicId: parkTopic.id },
  });
  console.log("✓ Topic assigned to class: At the Park");

  // ── Practice Results + Student Answers ──
  const results = [
    { id: "cmmx9rxuy001345wxsox89ppq", total: 3, correct: 2, incorrect: 1, score: 66.67, date: "2026-03-19T09:30:25.445Z",
      answers: [
        { id: "cmmx9rxv0001445wxe7j7r1fi", qId: "cmmx7zspd000145wxpesmiotj", answer: "Yes", isCorrect: true, attempt: 1 },
        { id: "cmmx9rxv0001545wxz7ahqxml", qId: "cmmx7zspd000245wx1p1q13fm", answer: "Green", isCorrect: true, attempt: 3 },
        { id: "cmmx9rxv0001645wxo9z40ddu", qId: "cmmx7zspd000345wxkmorftpa", answer: "aaa", isCorrect: false, attempt: 3 },
      ],
    },
    { id: "cmmxjigrc000w9swxzspx0hsc", total: 3, correct: 3, incorrect: 0, score: 100, date: "2026-03-19T14:02:59.538Z",
      answers: [
        { id: "cmmxjigre000x9swx2vc9ufpm", qId: "cmmx7zspd000145wxpesmiotj", answer: "Yes", isCorrect: true, attempt: 1 },
        { id: "cmmxjigre000y9swxnnupdu6t", qId: "cmmx7zspd000245wx1p1q13fm", answer: "Green", isCorrect: true, attempt: 1 },
        { id: "cmmxjigre000z9swxp2ot6lkn", qId: "cmmx7zspd000345wxkmorftpa", answer: "east", isCorrect: true, attempt: 1 },
      ],
    },
    { id: "cmmxjlgkv00109swxqe1i036d", total: 3, correct: 3, incorrect: 0, score: 100, date: "2026-03-19T14:05:19.272Z",
      answers: [
        { id: "cmmxjlgkx00119swx7r0jd28c", qId: "cmmx7zspd000145wxpesmiotj", answer: "Yes", isCorrect: true, attempt: 1 },
        { id: "cmmxjlgkx00129swxv74tgriq", qId: "cmmx7zspd000245wx1p1q13fm", answer: "Green", isCorrect: true, attempt: 3 },
        { id: "cmmxjlgkx00139swx275y0gdr", qId: "cmmx7zspd000345wxkmorftpa", answer: "east", isCorrect: true, attempt: 3 },
      ],
    },
    { id: "cmmxk5tpd00149swxbod2b7mq", total: 3, correct: 2, incorrect: 1, score: 66.67, date: "2026-03-19T14:21:09.402Z",
      answers: [
        { id: "cmmxk5tpf00159swx3m43a79j", qId: "cmmx7zspd000145wxpesmiotj", answer: "Yes", isCorrect: true, attempt: 1 },
        { id: "cmmxk5tpf00169swxwtt0nats", qId: "cmmx7zspd000245wx1p1q13fm", answer: "Green", isCorrect: true, attempt: 2 },
        { id: "cmmxk5tpf00179swxkxm185ek", qId: "cmmx7zspd000345wxkmorftpa", answer: "", isCorrect: false, attempt: 3 },
      ],
    },
    { id: "cmmxkescu00189swxi4cm3hzg", total: 3, correct: 1, incorrect: 2, score: 33.33, date: "2026-03-19T14:28:07.554Z",
      answers: [
        { id: "cmmxkesd000199swxrdd3tdxu", qId: "cmmx7zspd000145wxpesmiotj", answer: "No", isCorrect: false, attempt: 3 },
        { id: "cmmxkesd0001a9swx0hsvzj5l", qId: "cmmx7zspd000245wx1p1q13fm", answer: "Red", isCorrect: false, attempt: 3 },
        { id: "cmmxkesd0001b9swxl7yplkb6", qId: "cmmx7zspd000345wxkmorftpa", answer: "east", isCorrect: true, attempt: 1 },
      ],
    },
  ];

  for (const r of results) {
    await prisma.practiceResult.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id, userId: studentHang.id, practiceTestId: parkTest.id,
        totalQuestions: r.total, correctCount: r.correct, incorrectCount: r.incorrect,
        score: r.score, completedAt: new Date(r.date),
      },
    });
    for (const a of r.answers) {
      await prisma.studentAnswer.upsert({
        where: { id: a.id },
        update: {},
        create: {
          id: a.id, practiceResultId: r.id, questionId: a.qId, userId: studentHang.id,
          selectedAnswer: a.answer, isCorrect: a.isCorrect, attemptNumber: a.attempt,
          answeredAt: new Date(r.date),
        },
      });
    }
  }
  console.log("✓ Practice Results: 5 results, 15 answers");

  // ── Flashcard Progress ──
  // Countryside: all learned
  for (let i = 0; i < 15; i++) {
    await prisma.flashcardProgress.upsert({
      where: { userId_vocabularyId: { userId: studentHang.id, vocabularyId: `sample-vocab-countryside-${i}` } },
      update: {},
      create: {
        userId: studentHang.id, vocabularyId: `sample-vocab-countryside-${i}`,
        learned: true, learnedAt: new Date("2026-03-21T03:06:20.894Z"),
      },
    });
  }
  // Park: all not learned
  for (let i = 0; i < 8; i++) {
    await prisma.flashcardProgress.upsert({
      where: { userId_vocabularyId: { userId: studentHang.id, vocabularyId: `sample-vocab-park-${i}` } },
      update: {},
      create: {
        userId: studentHang.id, vocabularyId: `sample-vocab-park-${i}`,
        learned: false, learnedAt: null,
      },
    });
  }
  console.log("✓ Flashcard Progress: 23 records");

  console.log("\n✅ Seed complete!");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
