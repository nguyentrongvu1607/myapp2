
var path = require('path')
class BaseController{
    static generateMessage(res, error, data, header = 400) {
        // res.setContentType("text/html;charset=UTF-8");
        
        try {
          if (error) {
            res.status(header)
          } else {
            res.status(200)
          }
          res.set("ContentType","text/html;charset=UTF-8");
          res.set("CharacterEncoding","UTF-8");
          res.json({ success: !error, data: data || error.message })
        } catch (e) {
          res.status(404);
          res.json({ success: 0, data: e.toString() })
          debug('error when execute callback ' + e.message)
        }
    }

    static uploadSingleImage(req, res){
      if(req.file){
          var filePath =  req.file.path.split(path.sep );
          BaseController.generateMessage(res , 0 , filePath[filePath.length-2] + '/' + filePath[filePath.length-1] )
      }else{
        BaseController.generateMessage(res , new Error('upload failed') )
      }
    }

    static moveFile(req, res){

    }
}
module.exports = BaseController;