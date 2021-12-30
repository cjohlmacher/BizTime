const express = require('express');
const router = new express.Router();
const ExpressError = require('./expressError');
const db = require('./db');

router.get('/', async (req,res,next) => {
    try {
        const results = await db.query(`
            SELECT * 
            FROM companies`);
        return res.status(200).json({companies: results.rows});
    } catch (err) {
        return next(err);
    }
});

router.get('/:code', async (req,res,next) => {
    const code = req.params.code;
    try {
        const results = await db.query(`
            SELECT *
            FROM companies
            WHERE code=$1`, [code]);
        if (results.rows.length === 0 ) {
            throw new ExpressError(`No resource found for code: ${code}`, 404);
        };
        const company = results.rows[0];
        const invoices = await db.query(`
            SELECT * 
            FROM invoices
            WHERE comp_code = $1`, [code]
            );
        company.invoices = invoices.rows;
        return res.status(200).json({company: company})
    } catch (err) {
        return next(err);
    };
});

router.post('/', async (req,res,next) => {
    const {code, name, description} = req.body;
    try {
        const results = await db.query(`
            INSERT INTO companies 
            (code, name, description)
            VALUES ($1, $2, $3)
            RETURNING code, name, description`, [code,name,description]);
        if (results.rows.length === 0 ) {
            throw new ExpressError('Error creating resource', 404);
        };
        return res.status(201).json({company: results.rows[0]});
    } catch (err) {
        return next(err);
    };
});

router.patch('/:code', async (req,res,next) => {
    try {
        const code = req.params.code;
        const { name, description } = req.body;
        const results = await db.query(`
            UPDATE companies
            SET name=$1, description=$2
            WHERE code=$3
            RETURNING code,name,description`, [name,description,code]);
        if (results.rows.length === 0 ) {
            throw new ExpressError(`Error updating resource: ${code}`,404);
        };
        return res.status(200).json({company: results.rows[0]});
    } catch (err) {
        return next(err);
    };
});

router.delete('/:code', async (req,res,next) => {
    try {
        const code = req.params.code;
        await db.query(`
            DELETE FROM companies
            WHERE code=$1`, [code]);
        const results = await db.query(`
            SELECT *
            FROM companies
            WHERE code=$1`, [code]);
        if (results.rows.length > 0 ) {
            throw new ExpressError(`Error deleting resource`, 404);
        }
        return res.status(200).json({message: 'Deleted'});
    } catch(err) {
        return next(err);
    }
});

module.exports = router;