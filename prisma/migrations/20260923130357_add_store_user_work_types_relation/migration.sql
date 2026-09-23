-- AddForeignKey
ALTER TABLE "store_user_work_types" ADD CONSTRAINT "store_user_work_types_store_id_user_id_fkey" FOREIGN KEY ("store_id", "user_id") REFERENCES "store_users"("store_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
