CREATE TABLE usuario (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "email" VARCHAR(30) NOT NULL,
  "password" VARCHAR(30) NOT NULL,
  
  CONSTRAINT "PK_USER" PRIMARY KEY ("email")
);



