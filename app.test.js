process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('./app');
const db = require('./db');

let testCompany;
let testInvoice;
beforeEach(async () => {
    const company = await db.query(`
        INSERT INTO companies 
        (code, name, description)
        VALUES ('netflix', 'Netflix, Inc.', 'TV and Streaming Service')
        RETURNING code, name, description`);
    testCompany = company.rows[0];
    const invoice = await db.query(`
        INSERT INTO invoices 
        (comp_code, amt)
        VALUES ('netflix', 120)
        RETURNING id, comp_code, amt, add_date, paid, paid_date`);
    testInvoice = invoice.rows[0];
    testInvoice.add_date = new Date(testInvoice.add_date).toJSON();
    testInvoice.company = testCompany;
    const industry = await db.query(`
        INSERT INTO industries 
        (code, name)
        VALUES ('ent', 'Entertainment'), ('sub','Subscription')
        RETURNING code, name`);
    await db.query(`
        INSERT INTO company_industries
        (comp_code, ind_code)
        VALUES ('netflix', 'ent'),('netflix','sub')`);
});

afterEach(async () => {
    await db.query(`DELETE FROM companies`);
    await db.query(`DELETE FROM industries`);
});

afterAll( async () => {
    await db.end();
});

// Test company routes
describe('GET /companies', () => {
    test('Get all companies', async () => {
        const response = await request(app).get('/companies');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({companies: [{code: testCompany.code, name: testCompany.name, description: testCompany.description}]});
    });
});

describe('GET /companies:code', () => {
    test('Get company by code', async () => {
        const response = await request(app).get('/companies/netflix');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({company: {
            code: testCompany.code, 
            name: testCompany.name, 
            description: testCompany.description,
            invoices: [{
                id: testInvoice.id,
                add_date: testInvoice.add_date,
                comp_code: testInvoice.comp_code,
                amt: testInvoice.amt,
                paid: testInvoice.paid,
                paid_date: testInvoice.paid_date,
                }],
            industries: ['Entertainment','Subscription'],
            }});
    });
    test('Return error if requesting a non-existent company', async () => {
        const response = await request(app).get('/companies/apple');
        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual({error: {message: 'No resource found for code: apple', status: 404}, message: "No resource found for code: apple"});
    });
});

describe('POST /companies', () => {
    test('Create new company', async () => {
        const response = await request(app).post('/companies').send({code: 'apple', name: 'Apple Computer', description: 'Maker of OSX'});
        expect(response.statusCode).toBe(201);
        expect(response.body).toEqual({company: {code: 'apple', name: 'Apple Computer', description: 'Maker of OSX'}});
    });
    test('Return error if company code already exists', async () => {
        const response = await request(app).post('/companies').send({code: 'netflix', name: 'Apple Computer', description: 'Maker of OSX'});
        expect(response.statusCode).toBe(500);
    });
});

describe('PATCH /companies/:code', () => {
    test("Update a company's information", async () => {
        const response = await request(app).patch('/companies/netflix').send({name: 'Netflix Company', description: 'Streaming Media'});
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({company: {code: 'netflix', name: 'Netflix Company', description: 'Streaming Media'}});
    });
    test("Return error if updating a non-existent company", async () => {
        const response = await request(app).patch('/companies/apple').send({name: 'Apple Computer', description: 'Maker of OSX'});
        expect(response.statusCode).toBe(404);
    });
});

describe('DELETE /companies/:code', () => {
    test('Delete a company', async () => {
        const response = await request(app).delete('/companies/netflix');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({status: 'Deleted'});
    });
    test("Return error if deleting a non-existent company", async () => {
        const response = await request(app).patch('/companies/apple');
        expect(response.statusCode).toBe(404);
    });
});

// Tests for Invoice routes
describe('GET /invoices', () => {
    test('Gets all invoices', async () => {
        const response = await request(app).get('/invoices');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({invoices: [{id: testInvoice.id, comp_code: testInvoice.comp_code}]});
    });
});

describe('GET /invoice/:id', () => {
    test('Gets invoice by id', async () => {
        const response = await request(app).get(`/invoices/${testInvoice.id}`);
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({invoice: testInvoice});
    });
    test('Returns error if id is invalid', async () => {
        const response = await request(app).get(`/invoices/0`);
        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual({
            error: {
                message: 'No resource found for id: 0', 
                status: 404
            }, 
            message: 'No resource found for id: 0'
        });
    });
});

describe('POST /invoices', () => {
    test('Create new invoice', async () => {
        const response = await request(app).post('/invoices').send({comp_code: 'netflix', amt: '115'})
        expect(response.statusCode).toBe(201);
        expect(response.body).toEqual({invoice: {
            id: expect.any(Number),
            comp_code: 'netflix', 
            amt: 115, 
            paid: false,
            add_date: expect.any(String),
            paid_date: null
        }});
    });
    test('Returns error if fields not provided', async () => {
        const response = await request(app).post('/invoices').send({amt: '115'})
        expect(response.statusCode).toBe(500);
    });
});

describe('PUT /invoices/:id', () => {
    test('Update an invoice amount', async () => {
        const response = await request(app).patch(`/invoices/${testInvoice.id}`).send({amt: 500, paid: false});
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({invoice: {
            id: testInvoice.id, 
            comp_code: 'netflix', 
            amt: 500, 
            paid: false, 
            add_date: testInvoice.add_date, 
            paid_date: null}});
    });
    test('Update unpaid invoice to paid', async () => {
        const response = await request(app).patch(`/invoices/${testInvoice.id}`).send({amt: 500, paid: true});
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({invoice: {
            id: testInvoice.id, 
            comp_code: 'netflix', 
            amt: 500, 
            paid: true, 
            add_date: testInvoice.add_date, 
            paid_date: expect.any(String)}});
    });
    test('Update paid invoice to unpaid', async () => {
        await request(app).patch(`/invoices/${testInvoice.id}`).send({amt: 500, paid: true});
        const response = await request(app).patch(`/invoices/${testInvoice.id}`).send({amt: 500, paid: false});
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({invoice: {
            id: testInvoice.id, 
            comp_code: 'netflix', 
            amt: 500, 
            paid: false, 
            add_date: testInvoice.add_date, 
            paid_date: null}});
    });
    test('Maintains original paid date if paid status is unchanged', async () => {
        const paidResponse = await request(app).patch(`/invoices/${testInvoice.id}`).send({amt: 500, paid: true});
        const paidInvoice = paidResponse.body.invoice;
        const response = await request(app).patch(`/invoices/${testInvoice.id}`).send({amt: 500, paid: true});
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({invoice: {
            id: testInvoice.id, 
            comp_code: 'netflix', 
            amt: 500, 
            paid: true, 
            add_date: testInvoice.add_date, 
            paid_date: paidInvoice.paid_date}});
    });
    test('Returns error if id is invalid', async () => {
        const response = await request(app).patch(`/invoices/0`).send({amt: 500});
        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual({
            error: {
                message: 'Error updating resource: 0', 
                status: 404
            }, 
            message: 'Error updating resource: 0'
        });
    });
});

describe('DELETE /invoices/:id', () => {
    test('Delete an invoice', async() => {
        const response = await request(app).delete(`/invoices/${testInvoice.id}`);
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({status: 'Deleted'});
    });
});

// Test Industry routes
describe('GET /industries', () => {
    test('Get all industries', async () => {
        const response = await request(app).get('/industries');
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({industries: [{code: 'ent', name: 'Entertainment', companies: ['netflix']},{code: 'sub', name: 'Subscription', companies: ['netflix']}]});
    });
});

describe('POST /industries/:ind_code/companies', () => {
    test('Add association between industry and company', async () => {
        await request(app).post('/companies').send({code: 'apple', name: 'Apple Computer', description: 'Maker of OSX'});
        const response = await request(app).post('/industries/ent/companies').send({comp_code: 'apple'});
        expect(response.statusCode).toBe(201);
        expect(response.body).toEqual({industry: {code: 'ent', name: 'Entertainment', companies: ['netflix','apple']}});
    });
    test('Returns error if industry code does not exist', async () => {
        const response = await request(app).post('/industries/zzz/companies').send({comp_code: 'apple'});
        expect(response.statusCode).toBe(500);
    });
    test('Returns error if company code does not exist', async () => {
        const response = await request(app).post('/industries/ent/companies').send({comp_code: 'apple'});
        expect(response.statusCode).toBe(500);
    });
});