const express = require('express');
const axios = require('axios');
const _ = require('lodash');
const { Curl } = require('node-libcurl');
const app = express();
const port = 3000; 

// curl endpoints

function analyticResolver(...args) {
  const now = new Date();
  const key = `${now.getDate()}-${now.getMonth()}-${now.getFullYear()}-${now.getHours()}-${now.getMinutes()}-${Math.floor(
    now.getSeconds() / 20
  ) * 10}`;
  return key;
}

function storeAnalytics(){
  console.log("Storing analytics through curl");
  const promise = new Promise((resolve, reject) =>{
    const curl = new Curl();
    curl.setOpt('URL', 'https://intent-kit-16.hasura.app/api/rest/blogs');
    curl.setOpt(Curl.option.HTTPGET, true);
    curl.setOpt(Curl.option.HTTPHEADER, ['x-hasura-admin-secret: 32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6']);
    curl.setOpt(Curl.option.SSL_VERIFYPEER, false);

    curl.on('end', function (statusCode, data, headers) {
        this.close();
        const blogs = JSON.parse(data).blogs;
        const totalBlogs = blogs.length;
        const longestBlog = _.maxBy(blogs, 'title.length');
        const blogsContainingPrivacy = _.filter(blogs, blog => blog.title.toLowerCase().includes('privacy'));
        const uniqueBlogTitles = _.uniq(_.map(blogs, 'title'));
        resolve({
          totalBlogs,
          longestBlog: longestBlog.title,
          blogsWithPrivacy: blogsContainingPrivacy.length,
          uniqueBlogTitles: uniqueBlogTitles
        });
    });
    curl.on('error', (error, curlInstance) => {
      console.error('Request Error:', error);
      curl.close();
      reject(error);
    });

    curl.perform();
  })
  return promise;

};

let curlAnalytics = _.memoize(storeAnalytics, analyticResolver)

app.get('/api/blog-stats', (req, res) => {
  curlAnalytics()
  .then((result) => {
    res.json(result);
  }).catch((error) => {
    next(error);
  });
});

function searchResolver(...args) {
  const now = new Date();
  const key = `${now.getDate()}-${now.getMonth()}-${now.getFullYear()}-${now.getHours()}-${now.getMinutes()}-${Math.floor(
    now.getSeconds() / 10
  ) * 10}-${args[0]}`;
  return key;
}

function curlSearch(query){
  console.log("curl Function called with query : " + query);
  const promise = new Promise((resolve, reject) => {
    const curl = new Curl();
    curl.setOpt('URL', 'https://intent-kit-16.hasura.app/api/rest/blogs');
    curl.setOpt(Curl.option.HTTPGET, true);
    curl.setOpt(Curl.option.HTTPHEADER, ['x-hasura-admin-secret: 32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6']);
    curl.setOpt(Curl.option.SSL_VERIFYPEER, false);

    curl.on('end', function (statusCode, data, headers) {
      this.close();
      const blogs = JSON.parse(data).blogs;
      const filteredBlogs = _.filter(blogs, blog => blog.title.toLowerCase().includes(query.toLowerCase()));
      resolve(filteredBlogs);
    });

    curl.on('error', (error, curlInstance) => {
      console.error('Request Error:', error);
      curl.close();
      reject(error);
    });

    curl.perform();
  })

  return promise;

}

var curlsearchResult = _.memoize(curlSearch, searchResolver);

app.get('/api/blog-search', (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  curlsearchResult(query)
  .then((result) => {
    res.json(result);
  }).catch((error) => {
    next(error);
  });

});


// axios endpoints

function result(query){
  console.log("Function called with query : " + query);
  const promise  = new Promise((resolve, reject) => {
    axios.get('https://intent-kit-16.hasura.app/api/rest/blogs', {
      headers: {
        'x-hasura-admin-secret': '32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6'
      }
    }).then(response => {
      const blogs = response.data.blogs;
      const filteredBlogs = _.filter(blogs, blog => blog.title.toLowerCase().includes(query.toLowerCase()));
      resolve( filteredBlogs);
    }) .catch(error => {
      reject(error);
    });
  })
 return promise;
}

var searchResult = _.memoize(result, args => args);

app.get('/api/blog-search-axios', (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  searchResult(query)
  .then((result) => {
    res.json(result);
  }).catch((error) => {
    next(error);
  });

});


app.use('/api/blog-stats-axios', async (req, res, next) => {
  try {
    const response = await axios.get('https://intent-kit-16.hasura.app/api/rest/blogs', {
      headers: {
        'x-hasura-admin-secret': '32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6'
      }
    });
    const blogs = response.data.blogs;
    const totalBlogs = blogs.length;
    const longestBlog = _.maxBy(blogs, 'title.length');   
    const blogsContainingPrivacy = _.filter(blogs, blog => blog.title.toLowerCase().includes('privacy'));
    const uniqueBlogTitles = _.uniq(_.map(blogs, 'title'));

    res.json({
      totalBlogs,
      longestBlog: longestBlog.title,
      blogsWithPrivacy: blogsContainingPrivacy.length,
      uniqueBlogTitles: uniqueBlogTitles
    });
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
