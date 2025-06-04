import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Create Users
  const user1 = await prisma.user.create({
    data: {
      walletAddress: '0x1234567890123456789012345678901234567890',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      walletAddress: '0x0987654321098765432109876543210987654321',
    },
  });

  console.log(`Created users: ${user1.id}, ${user2.id}`);

  // Create Payments for Repository Submissions
  const submissionPayment1 = await prisma.payment.create({
    data: {
      userId: user1.id,
      walletAddress: user1.walletAddress,
      tokenAmount: new Decimal('10'),
      week: '2024-W23',
      txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
    },
  });

  const repo1 = await prisma.repository.create({
    data: {
      title: 'Awesome Project',
      description: 'A really cool project that does amazing things.',
      githubUrl: 'https://github.com/user/awesome-project',
      submitterId: user1.id,
      paymentId: submissionPayment1.id,
      totalTokenAmount: new Decimal('1000'),
      totalVotes: 1,
    },
  });

  await prisma.payment.update({
    where: { id: submissionPayment1.id },
    data: { repository: { connect: { id: repo1.id } } },
  });

  const submissionPayment2 = await prisma.payment.create({
    data: {
      userId: user2.id,
      walletAddress: user2.walletAddress,
      tokenAmount: new Decimal('15'),
      week: '2024-W23',
      txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
    },
  });

  const repo2 = await prisma.repository.create({
    data: {
      title: 'Another Great Repo',
      description: 'This repository solves an important problem.',
      githubUrl: 'https://github.com/user/another-great-repo',
      submitterId: user2.id,
      paymentId: submissionPayment2.id,
      totalTokenAmount: new Decimal('500'),
      totalVotes: 1,
    },
  });

  await prisma.payment.update({
    where: { id: submissionPayment2.id },
    data: { repository: { connect: { id: repo2.id } } },
  });

  console.log(`Created repositories: ${repo1.id}, ${repo2.id} with their submission payments`);

  // Create Votes
  const vote1 = await prisma.vote.create({
    data: {
      userId: user1.id,
      repositoryId: repo1.id,
      tokenAmount: new Decimal('1000'),
      week: '2024-W23',
    },
  });

  const vote2 = await prisma.vote.create({
    data: {
      userId: user2.id,
      repositoryId: repo2.id,
      tokenAmount: new Decimal('500'),
      week: '2024-W23',
    },
  });

  const vote3 = await prisma.vote.create({
    data: {
      userId: user1.id,
      repositoryId: repo2.id,
      tokenAmount: new Decimal('250'),
      week: '2024-W24',
    },
  });

  console.log(`Created votes: ${vote1.id}, ${vote2.id}, ${vote3.id}`);

  await prisma.repository.update({
    where: { id: repo2.id },
    data: {
      totalTokenAmount: { increment: new Decimal('250') },
      totalVotes: { increment: 1 },
    },
  });

  console.log(`Updated repository ${repo2.id} with additional vote.`);

  // Payments for Votes
  await prisma.payment.create({
    data: {
      userId: user1.id,
      walletAddress: user1.walletAddress,
      tokenAmount: new Decimal('100'),
      voteId: vote1.id,
      week: '2024-W23',
      txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
    },
  });

  await prisma.payment.create({
    data: {
      userId: user2.id,
      walletAddress: user2.walletAddress,
      tokenAmount: new Decimal('50'),
      voteId: vote2.id,
      week: '2024-W23',
      txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
    },
  });

  await prisma.payment.create({
    data: {
      userId: user1.id,
      walletAddress: user1.walletAddress,
      tokenAmount: new Decimal('25'),
      voteId: vote3.id,
      week: '2024-W24',
      txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
    },
  });

  console.log(`Created payments for votes`);

  // Weekly Leaderboard
  await prisma.weeklyRepoLeaderboard.createMany({
    data: [
      {
        repoId: repo1.id,
        rank: 1,
        week: '2024-W23',
      },
      {
        repoId: repo2.id,
        rank: 2,
        week: '2024-W23',
      },
      {
        repoId: repo2.id,
        rank: 1,
        week: '2024-W24',
      },
    ],
  });

  console.log(`Created weekly leaderboard entries`);

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
