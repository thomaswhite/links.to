$(function (){
	$('form').iframePostForm({
		json : true,
		post : function ()	{
			console.info('Uploading..');
		},
		complete : function (response){

			if (!response.success){
                console.error('Bad upload');
			}else{
                console.error('Upload OK');
			}
        }
	});
});