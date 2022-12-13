import express from "express";
import pg from "pg";
import dayjs from 'dayjs';
import cors from 'cors'; 

const { Pool } = pg;

const connection = new Pool({
  user: "postgres",
  host: "localhost",
  port: 5432,
  database: "boardcamp",
  password: "ra-16180339887",
});

const app = express();
app.use(express.json());
app.use(cors()); 

app.get("/categories", async (req, res) => {
  const categories = await connection.query("SELECT * FROM categories");
  res.send(categories.rows);
});

async function categoryNameExist(name) {

  const elementsWithName = await connection.query(
    "SELECT * FROM categories WHERE categories.name = ($1)",
    [name]
  );

  const nameExist = elementsWithName.rows[0];

  if (nameExist) {
    return true;
  } else {
    return false;
  }

}


app.post("/categories", async (req, res) => {
  const { name } = req.body;

  //name não pode estar vazio ⇒ nesse caso, deve retornar status 400
  if (!name) {
    res.status(400).send("name vazio");
    return;
  }

  //name não pode ser um nome de categoria já existente ⇒ nesse caso deve retornar status 409
  if (await categoryNameExist(name)) {
    res.status(409).send("name já existe!");
    return;
  }

  await connection.query(
    "INSERT INTO categories (name) VALUES ($1)",
    [name]
  );

  res.sendStatus(201);
});


async function nameGameExist(name) {
  const nameGameList = await connection.query(
    "SELECT * FROM games WHERE games.name = ($1)",
    [name]
  );

  const nameExist = nameGameList.rows[0];

  if (nameExist) {
    return true;
  } else {
    console.log("name n existe");
    return false;
  }
}

function errorGamesPost(gamesPostObj) {
  let errorMessage = "";
  if (!gamesPostObj.name) {
    errorMessage += "nome vazio |";
  }
  if (gamesPostObj.stockTotal < 0 || gamesPostObj.pricePerDay < 0) {
    errorMessage += "stockTotal ou pricePerDay < 0 |";
  }
  console.log("errorMessage", errorMessage);
  return errorMessage;

}

app.post("/games", async (req, res) => {
  const { name, image, stockTotal, categoryId, pricePerDay } = req.body;
  console.log(req.body);

  const error400 = errorGamesPost(req.body);
  if (error400) {
    console.log("entra erro 400");
    res.status(400).send(error400);
    return;
  }

  if (await nameGameExist(name)) {
    res.status(409).send("game name already exists");
    return;
  }

  await connection.query(
    `INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5)`,
    [name, image, stockTotal, categoryId, pricePerDay]
  );

  res.sendStatus(201);
});


app.get("/games", async (req, res) => {
  const { name } = req.query;
  /* const nameLowerCase = name.toLowerCase();
  const nameUpCase = nameLowerCase[0].toUpperCase() + nameLowerCase.substring(1); */
  //res.send(nameLowerCase + " e " + nameUpCase);

  let games = undefined;

  if (name) {
    const nameLowerCase = name.toLowerCase();
    const nameUpCase = nameLowerCase[0].toUpperCase() + nameLowerCase.substring(1);

    games = await connection.query(
      `SELECT games.*, categories.name as "categoryName" FROM games JOIN categories ON games."categoryId" = categories.id WHERE games.name LIKE $1 OR games.name LIKE $2`,
      [`${nameLowerCase}%`, `${nameUpCase}%`]
    );
  } else {
    games = await connection.query(
      `SELECT games.*, categories.name as "categoryName" FROM games JOIN categories ON games."categoryId" = categories.id `
    );
  }

  res.send(games.rows);
});

function isValidDate(dateString) {
  var regEx = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateString.match(regEx)) return false;  // Invalid format
  var d = new Date(dateString);
  var dNum = d.getTime();
  if (!dNum && dNum !== 0) return false; // NaN value, Invalid date
  return d.toISOString().slice(0, 10) === dateString;
}

function validateCustomer({ cpf, name, phone, birthday }) {
  let errorMessage = "";

  if (!cpf.length === 11) {
    errorMessage += "CPF tem que ter 11 caracteres |";
  }
  if (phone.length !== 10 && phone.length !== 11) {
    errorMessage += "phone tem que ter 10 ou 11 caracteres |";
  }
  if (!name) {
    errorMessage += "name não pode ser vazio |";
  }

  const birthDate = isValidDate(birthday);

  if (!birthDate) {
    errorMessage += "data inválida |";
  }

  return errorMessage;
}

async function cpfExist(cpf) {
  console.log("cpf", cpf);

  const cpfAlreadyExist = await connection.query(
    `SELECT * FROM customers WHERE customers.cpf = ($1)`, [cpf]
  );

  /* console.log("cpfAlreadyExist", cpfAlreadyExist.rows); */

  if (cpfAlreadyExist.rows[0]) {
    return true;
  } else {
    return false;
  }
}


//inserir customer
app.post("/customers", async (req, res) => {

  const customer = req.body;
  let { name, cpf, phone, birthday } = req.body;

  const date = dayjs(birthday).format("YYYY-MM-DD");
  console.log(date);


  /*   {
      id: 1,
      name: 'João Alfredo',
      phone: '21998899222',
      cpf: '01234567890',
      birthday: '1992-10-05'
    } */
  const errorMsg400 = validateCustomer(customer);
  if (errorMsg400) {
    res.status(400).send(errorMsg400);
    return;
  };

  if (await cpfExist(customer.cpf)) {
    res.status(409).send("cpf já existe!");
    return;
  }

  await connection.query("INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1,$2,$3,$4)",
    [name, phone, cpf, date]
  );

  res.status(201).send("customers inserido com sucesso");

});

function formatingDateToShow(result) {
  for (let i = 0; i < result.rows.length; i++) {
    result.rows[i].birthday = dayjs(result.rows[i].birthday).format("YYYY-MM-DD");
  }
}


app.get("/customers", async (req, res) => {
  const { cpf } = req.query;
  let customers = undefined;

  if (cpf) {
    customers = await connection.query(
      `SELECT * FROM customers WHERE customers.cpf LIKE $1`,
      [`${cpf}%`]
    );
  } else {
    customers = await connection.query(
      `SELECT * FROM customers;`
    );
  }

  formatingDateToShow(customers);

  res.send(customers.rows);
});

app.get("/customers/:id", async (req, res) => {
  const id = req.params.id;

  const result = await connection.query(
    `SELECT * FROM customers WHERE customers.id = $1`,
    [id]
  );

  if (result.rows.length > 0) {
    res.send(result.rows);
  } else {
    res.status(404).send("Não existe cliente com esse id");
  }

});


app.put("/customers/:id", async (req, res) => {

  const id = req.params.id;

  const bodyUpdate = req.body;
  let { name, cpf, phone, birthday } = req.body;

  const date = dayjs(birthday).format("YYYY-MM-DD");



  /*  {
     name: 'João Alfredo',
     phone: '21998899222',
     cpf: '01234567890',
     birthday: '1992-10-05'
   } */

  const errorMsg400 = validateCustomer(bodyUpdate);
  if (errorMsg400) {
    res.status(400).send(errorMsg400);
    return;
  };

  //*************************** */
  //nao deixa dar update em cpf que ja existe

  /*  if(await cpfExist(cpf)){
    res.status(409).send("cpf já existe!");
    return;
  } */

  const idPessoaComCpf = await connection.query(
    `SELECT customers.id FROM customers WHERE cpf = $1 `,
    [cpf]
  );

  let isSamePerson = true;

  const isThereCpfInRegister = idPessoaComCpf.rows.length > 0;
  if (isThereCpfInRegister) {
    isSamePerson = (idPessoaComCpf.rows[0].id === parseInt(id));

  }



  if (isSamePerson) {

    try {
      await connection.query(
        `UPDATE customers SET name = $1, phone = $2, cpf = $3, birthday = $4 WHERE customers.id = $5 `,
        [name, phone, cpf, date, id]
      );
      res.status(200).send("Update customers com sucesso");
    } catch {
      res.status(400).send("Update não realizado");
    };

  } else {
    res.status(409).send("CPF existente em outro usuário, você não pode atualizar");
  }


})


/* app.get("/api/products", async (req, res) => {
  const products = await connection.query("SELECT * FROM produtos");
  res.send(products.rows);
}); */

async function originalPriceOf(gameId, daysRented) {
  console.log("entra originalPriceOf");
  const idGameSearch = await connection.query(
    `SELECT games."pricePerDay" FROM games WHERE games.id = $1`,
    [gameId]
  );

  let totalPrice = 0;
  //if(idGameSearch.rows[0] && daysRented > 0){
  const priceGame = idGameSearch.rows[0].pricePerDay;
  totalPrice = parseInt(priceGame) * parseInt(daysRented);
  //}
  console.log(totalPrice);
  return totalPrice;
}

async function customerNotExist(id) {
  const result = await connection.query(
    `SELECT * FROM customers WHERE customers.id = $1`,
    [id]
  )
  if (result.rows[0]) {
    return false;
  } else {
    return true;
  }
}

async function idGameExist(gameId) {

  const result = await connection.query(
    `SELECT * FROM games WHERE games.id = $1`,
    [gameId]
  );

  if (result.rows.length > 0) {
    return true;
  } else {
    return false;
  }

}

async function numberCurrentRentals(gameId) {
  const result = await connection.query(
    `SELECT * FROM rentals WHERE rentals."gameId" = $1`,
    [gameId]
  );

  return result.rows.length;
}

async function isThereStock(gameId) {
  const result = await connection.query(
    `SELECT games."stockTotal" FROM games WHERE games.id = $1`,
    [gameId]);

  const gameStock = result.rows[0].stockTotal;

  const numCurrentRentals = await numberCurrentRentals(gameId);

  if (numCurrentRentals < gameStock) {
    return true;
  } else {
    return false;
  }

}

app.post("/rentals", async (req, res) => {
  const { customerId, gameId, daysRented } = req.body;

  //
  if (await customerNotExist(customerId)) {
    res.status(400).send("cliente não existe")
    return;
  }
  //
  if (!await idGameExist(gameId)) {
    res.status(400).send("id game not exist");
    return;
  }
  //
  if (daysRented < 0) {
    res.status(400).send(daysRented < 0);
    return;
  }

  if (!await isThereStock(gameId)) {
    res.status(400).send("Não tem mais em estoque, estão todos alugados");
    return;
  }

  const today = dayjs().format("YYYY-MM-DD");
  //
  const originalPrice = await originalPriceOf(gameId, daysRented);

  /*  console.log([customerId, gameId, today, daysRented, null, originalPrice, null]) */

  try {
    const result = await connection.query(
      `INSERT INTO rentals ("customerId","gameId","rentDate","daysRented","returnDate","originalPrice","delayFee")
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [customerId, gameId, today, daysRented, null, originalPrice, null]
    );

    res.status(201).send("rentals inserido");
  } catch (err) {
    console.log(err);
    res.status(400).send("rentals nao inserido");
  }

})

async function allRentalsGet() {

  const allRentalsFormated = [];

  const allRentals = await connection.query(
    `SELECT * FROM rentals;`
  );
  console.log(allRentals.rows[0]);

  const nRentals = allRentals.rows.length;

  for (let i = 0; i < nRentals; i++) {
    const customerResult = await connection.query(
      `SELECT * FROM customers WHERE customers.id = $1`,
      [allRentals.rows[i].customerId]
    );

    const gameResult = await connection.query(
      `SELECT * FROM games WHERE games.id = $1`,
      [allRentals.rows[i].gameId]
    );
    
    let customer = customerResult.rows[0];
    let game = gameResult.rows[0];
  
    delete customer.phone;
    delete customer.cpf;
    delete customer.birthday;

    delete game.stockTotal;
    delete game.pricePerDay;
    delete game.image;


    const categoryGame = await connection.query(
      `SELECT * FROM categories WHERE categories.id = $1`,
      [allRentals.rows[i].gameId]
    );

    game.categoryName = categoryGame.rows[0].name;

    const newRegister = {...allRentals.rows[i],customer,game}

    allRentalsFormated.push(newRegister);

  } 

  return allRentalsFormated;

}

app.get("/rentals", async (req, res) => {
  const { customerId, gameId } = req.query;

  if (customerId) {
    const resultCustomerId = await connection.query(
      `SELECT * FROM rentals WHERE rentals."customerId"=$1`,
      [customerId]
    )

    res.send(resultCustomerId.rows);
    return;
  }

  if (gameId) {
    const resultGameId = await connection.query(
      `SELECT * FROM rentals WHERE rentals."gameId"=$1`,
      [gameId]
    )
    res.send(resultGameId.rows);
    return;
  }


  const allRentals = await allRentalsGet();

  res.status(200).send(allRentals);

})


function calcDelayFee({ rentDate, daysRented, originalPrice, returnDate }) {
  const devolutionDate = dayjs(returnDate);
  //const devolutionDate = dayjs("2022-12-25");

  const pricePerDay = originalPrice / daysRented;

  //calcula dias de atraso
  const delayDays = devolutionDate.diff(dayjs(rentDate), "day");
  console.log("delayDays", delayDays);

  //multiplica dias de atraso pelo preco por dia
  const delayFee = delayDays * pricePerDay;
  console.log("delayFee", delayFee);
  //retona o valor 
  return delayFee;

}

async function idRentalsExist(id) {
  const result = await connection.query(
    `SELECT * FROM rentals WHERE rentals.id = $1`,
    [id]);

  if (result.rows.length <= 0) {
    return false;
  } else {
    return true
  }
}

app.post("/rentals/:id/return", async (req, res) => {
  const id = req.params.id;

  const result = await connection.query(
    `SELECT * FROM rentals WHERE rentals.id = $1`,
    [id]);

  if (result.rows.length <= 0) {
    res.status(404).send("Rentals id nao existe");
    return;
  }

  if (result.rows[0].returnDate !== null) {
    res.status(400).send("aluguel já finalizado!")
    return;
  }

  result.rows[0].rentDate = dayjs(result.rows[0].rentDate).format("YYYY-MM-DD");
  const today = dayjs().format("YYYY-MM-DD");
  result.rows[0].returnDate = today;

  const delayFeePay = calcDelayFee(result.rows[0]);
  result.rows[0].delayFee = delayFeePay;
  //atualiza dados returnDate no bd;
  await connection.query(
    `UPDATE rentals SET "returnDate"= $1 WHERE rentals.id = $2`,
    [today, id]);

  //atualiza delayFee no bd
  await connection.query(
    `UPDATE rentals SET "delayFee"= $1 WHERE rentals.id = $2`,
    [delayFeePay, id]);

  res.status(200).send(result.rows);
  return;
})

app.delete("/rentals/:id", async (req, res) => {
  const id = req.params.id;

  const idRentalsExist = await connection.query(
    `SELECT * FROM rentals WHERE rentals.id = $1`,
    [id]);

  if (idRentalsExist.rows.length <= 0) {
    res.status(404).send("Rentals id nao existe");
    return;
  }


  if (idRentalsExist.rows[0].returnDate !== null) {
    res.status(400).send("aluguel já finalizado!")
    return;
  }

  try {
    await connection.query(
      `DELETE FROM rentals WHERE rentals.id = $1`,
      [id]);

    res.status(200).send("DELETE com sucesso");
  } catch (err) {
    console.log(err);
    res.status(401).send("Não deletado |"+ err);
  }

});

app.listen(4000, () => {
  console.log("Server listening on port 4000.");
});