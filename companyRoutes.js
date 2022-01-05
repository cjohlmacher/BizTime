const express = require('express');
const router = new express.Router();
const ExpressError = require('./expressError');
const db = require('./db');
const slugify = require('slugify');

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
        const industries = await db.query(`
            SELECT industries.name
            FROM companies
            LEFT JOIN company_industries 
            ON companies.code = comp_code
            JOIN industries
            ON industries.code = ind_code
            WHERE comp_code = $1`, [code]
            );
        company.industries = industries.rows.map(industry => {
            return industry.name;
        });
        return res.status(200).json({company: company})
    } catch (err) {
        return next(err);
    };
});

router.post('/', async (req,res,next) => {
    try {
        const {name, description} = req.body;
        const code = slugify(name, {
            replacement: '-',
            lower: true,
            strict: true,
            trim: true,
        });
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
        return res.status(200).json({status: 'Deleted'});
    } catch(err) {
        return next(err);
    }
});

module.exports = router;