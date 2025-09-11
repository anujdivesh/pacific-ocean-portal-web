

  export function get_url(value,id = null){

    //var server = "http://localhost:8000";
    var server = "https://ocean-middleware.spc.int"
    switch (value) {
      case 'root-path':
        return server
      case 'root_menu':
        return server+'/middleware/api/main_menu/?format=json&theme_id='+id;
      case 'metadata':
        return server+'/middleware/api/webapp_product/'+id+'/?format=json';
      case 'layer':
        return server+'/middleware/api/layer_web_map/'+id+'/?format=json';
      case 'theme':
        return server+'/middleware/api/theme/?format=json';
      case 'country':
        return server+'/middleware/api/country/?format=json';
      case 'getLegend':
        return 'https://ocean-cgi.spc.int/cgi-bin/getLegend.py?units=null&layer_map='+id+'&coral=False';
      case 'tailored_menu':
        return server+'/middleware/api/tailored_menu'
      case 'getMap':
        return 'https://ocean-plotter.spc.int/plotter/getMap?'
      case 'cgi-root':
        return 'https://ocean-plotter.spc.int'
      case 'cgi-library':
        return 'https://ocean-cgi.spc.int'
      case 'geowebcache':
        return 'https://ocean-plotter.spc.int/plotter/cache'
        //return 'https://localhost:8000/plotter/cache'
      case 'insitu':
        return 'https://ocean-obs-api.spc.int/insitu/types/'
      case 'insitu-station':
        return 'https://ocean-obs-api.spc.int/insitu/get_data/station'
      case 'dataset':
        return 'https://ocean-middleware.spc.int/middleware/api/dataset/'+id+'/?format=json'
      default:
        return 'https://api.example.com/default';
    }
  };