/**
 * Created with JetBrains WebStorm.
 * User: Thomas
 * Date: 09/09/12
 * Time: 11:31
 * To change this template use File | Settings | File Templates.
 */

module.exports = {
    make: function( param ){
        param = param || {};
        var crumbs = [
            {
                href:'/colls',
                title:'All Collections'
            }
        ];
        if( param.owner ){
            crumbs.push({
               href:'/colls/mine',
               title:'My collections' + (param.colls ? ' (' +  param.colls +')' : '')
            });
        }
        if( param.coll){
            crumbs.push({
                href:'/coll/' + param.coll.id,
                title: param.coll.title + (param.coll.links ? ' (' +  param.colls.links +')' : '')
            });
        }
        if( param.link){
            crumbs.push({
                href:'/coll/' + param.link.id,
                title: param.link.title
            });
        }
        if( param.imports ){
            crumbs = [{
                href:'/imports',
                title: 'Imports'
            }];
        }
        if( param.import ){
            crumbs = [{
                href:'/imports',
                title: 'Imports'
                },
                {
                    title: param.title
                }
            ];

        }
        return crumbs;
    }
};