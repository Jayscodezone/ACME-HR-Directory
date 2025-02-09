const express = require(`express`);
const pg = require('pg');
//express app 
const app = express();
app.use (express.json());
//db client 

// Create tables 
const client = new pg.Client('postgres://localhost:5432/acme_hr_directory');

 // Initialize database and start server
const init = async () => {
  try {
    await client.connect();   

   const SQL = `
      DROP TABLE IF EXISTS employees;
      DROP TABLE IF EXISTS departments;

      CREATE TABLE departments(
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL
      );

      CREATE TABLE employees(
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        department_id INTEGER REFERENCES departments(id) NOT NULL
      );

      INSERT INTO departments(name) VALUES ('Accounting'), ('Creative'), ('Information Technology');

      INSERT INTO employees(name, department_id) VALUES
        ('Donna', (SELECT id FROM departments WHERE name = 'Accounting')),
        ('Alistair', (SELECT id FROM departments WHERE name = 'Creative'));
    `;

    await client.query(SQL);
    console.log('Database initialized and seeded.');

    // Start the server
    const PORT = 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Routes
app.get('/api/employees', async (req, res, next) => {
  try {
    const SQL = 'SELECT * FROM employees';
    const response = await client.query(SQL);
    res.json(response.rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/departments', async (req, res, next) => {
  try {
    const SQL = 'SELECT * FROM departments';
    const response = await client.query(SQL);
    res.json(response.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/employees', async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const SQL = 'INSERT INTO employees(name, department_id) VALUES($1, $2) RETURNING *';
    const response = await client.query(SQL, [name, department_id]);
    res.status(201).json(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/employees/:id', async (req, res, next) => {
  try {
    const SQL = 'DELETE FROM employees WHERE id = $1';
    await client.query(SQL, [req.params.id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.put('/api/employees/:id', async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const SQL = 'UPDATE employees SET name = $1, department_id = $2, updated_at = now() WHERE id = $3 RETURNING *';
    const response = await client.query(SQL, [name, department_id, req.params.id]);
    if (response.rows.length === 0) {
      res.status(404).json({ error: 'Employee not found' });
    } else {
      res.json(response.rows[0]);
    }
  } catch (error) {
    next(error);
  }
});

// Error handling route
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

// Initialize the app
init();
}