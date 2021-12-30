const express = require('express');
const router = new express.Router();
const ExpressError = require('./expressError');
const db = require('./db');

router.get('/', async (req,res,next) => {
    try {
        const results = await db.query(`
            SELECT * 
            FROM invoices`);
        return res.status(200).json({invoices: results.rows});
    } catch (err) {
        return next(err);
    }
});

router.get('/:id', async (req,res,next) => {
    const id = req.params.id;
    try {
        const results = await db.query(`
            SELECT *
            FROM invoices
            WHERE id=$1`, [id]);
        if (results.rows.length === 0 ) {
            throw new ExpressError(`No resource found for id: ${id}`, 404);
        };
        const invoice = results.rows[0];
        const code = invoice.comp_code;
        const companies = await db.query(`
            SELECT *
            FROM companies
            WHERE code=$1`, [code]);
        if (companies.rows.length === 0 ) {
            throw new ExpressError(`No resource found for company: ${code}`, 404);
        };
        invoice.company = companies.rows[0];
        return res.status(200).json({invoice: results.rows[0]})
    } catch (err) {
        return next(err);
    };
});

router.post('/', async (req,res,next) => {
    const { comp_code, amt } = req.body;
    try {
        const results = await db.query(`
            INSERT INTO invoices 
            (comp_code, amt)
            VALUES ($1, $2)
            RETURNING id, comp_code, amt, paid, add_date, paid_date`, 
            [comp_code, amt]);
        if (results.rows.length === 0 ) {
            throw new ExpressError('Error creating resource', 404);
        };
        return res.status(201).json({invoice: results.rows[0]});
    } catch (err) {
        return next(err);
    };
});

router.patch('/:id', async (req,res,next) => {
    try {
        const id = req.params.id;
        const { amt } = req.body;
        const results = await db.query(`
            UPDATE invoices
            SET amt=$1
            WHERE id=$2
            RETURNING id, comp_code, amt, paid, add_date, paid_date`, 
            [amt,id]);
        if (results.rows.length === 0 ) {
            throw new ExpressError(`Error updating resource: ${id}`,404);
        };
        return res.status(200).json({invoice: results.rows[0]});
    } catch (err) {
        return next(err);
    };
});

router.delete('/:id', async (req,res,next) => {
    try {
        const id = req.params.id;
        await db.query(`
            DELETE FROM invoices
            WHERE id=$1`, [id]);
        const results = await db.query(`
            SELECT *
            FROM invoices
            WHERE id=$1`, [id]);
        if (results.rows.length > 0 ) {
            throw new ExpressError(`Error deleting resource`, 404);
        }
        return res.status(200).json({message: 'Deleted'});
    } catch(err) {
        return next(err);
    }
});

module.exports = router;