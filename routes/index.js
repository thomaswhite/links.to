
/*
 * GET home page.
 */

var dummy = 1;

exports.index = function(req, res){
  res.render('layout', { title: 'Express' });
};