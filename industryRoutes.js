const express = require('express');
const router = new express.Router();
const ExpressError = require('./expressError');
const db = require('./db');

router.get('/', async (req,res,next) => {
    try {
        const response = await db.query(`
            SELECT *
            FROM industries`);
        console.log(response.rows);
        const industryPromises = response.rows.map(async (industry) => {
            const companies = await db.query(`
                SELECT comp_code
                FROM company_industries
                JOIN industries 
                ON company_industries.ind_code = industries.code
                WHERE ind_code = $1`,[industry.code]
            );
            const compCodes = companies.rows.map(codeObj => {
                return codeObj.comp_code;
            })
            industry.companies = compCodes;
            return industry;
        });
        const industries = await Promise.all(industryPromises);
        console.log(industries);
        return res.status(200).json({industries: industries})
    } catch(err) {
        return next(err);
    };
});

router.post('/:ind_code/companies', async (req,res,next) => {
    try {
        const ind_code = req.params.ind_code;
        const { comp_code } = req.body;
        await db.query(`
            INSERT INTO company_industries
            (comp_code, ind_code)
            VALUES ($1, $2)
            `, [comp_code, ind_code]);
        const response = await db.query(`
            SELECT code, name
            FROM industries
            WHERE code = $1`,[ind_code]
        );
        const companies = await db.query(`
            SELECT comp_code 
            FROM industries
            LEFT JOIN company_industries
            ON industries.code = company_industries.ind_code
            JOIN companies 
            ON company_industries.comp_code = companies.code
            WHERE ind_code = $1`, [ind_code]);
        const industry = response.rows[0];
        industry.companies = companies.rows.map(company => {
            return company.comp_code;
        });
        return res.status(201).json({industry: industry});
    } catch(err) {
        return next(err);
    };
});


module.exports = router;