/*
  Warnings:

  - Added the required column `userId` to the `CreditCardPurchase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `CreditCardPurchase` ADD COLUMN `userId` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `CreditCardPurchase_userId_idx` ON `CreditCardPurchase`(`userId`);

-- AddForeignKey
ALTER TABLE `CreditCardPurchase` ADD CONSTRAINT `CreditCardPurchase_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
