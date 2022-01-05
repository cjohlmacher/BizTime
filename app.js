/** BizTime express application. */


const express = require("express");

const app = express();
const ExpressError = require("./expressError");
const companyRoutes = require('./companyRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const industryRoutes = require('./industryRoutes');

app.use(express.json());

app.use('/companies',companyRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/industries',industryRoutes);


/** 404 handler */

app.use(function(req, res, next) {
  const err = new ExpressError("Not Found", 404);
  return next(err);
});

/** general error handler */

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500);

  return res.json({
    error: err,
    message: err.message
  });
});


module.exports = app;
