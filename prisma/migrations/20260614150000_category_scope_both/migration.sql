-- AlterCategory: add BOTH scope for categories usable in income and expense

ALTER TABLE `Category` MODIFY `type` ENUM('INCOME', 'EXPENSE', 'BOTH') NOT NULL;
