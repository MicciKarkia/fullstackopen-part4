const supertest = require('supertest')
const mongoose = require('mongoose')
const helper = require('./test_helper')
const app = require('../app')
const api = supertest(app)

const Blog = require('../models/blog')

beforeEach(async () => {
  await Blog.deleteMany({})

  const blogObjects = helper.initialBlogs.map(blog => new Blog(blog))
  const promiseArray = blogObjects.map(blog => blog.save())
  await Promise.all(promiseArray)
})

describe('when there is initially some blog posts saved', () => {
  test('blogs returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('all blogs are returned', async () => {
    const response = await api.get('/api/blogs')

    expect(response.body).toHaveLength(helper.initialBlogs.length)
  })

  test('a specific blog post is within the returned blog posts', async () => {
    const response = await api.get('/api/blogs')

    const authors = response.body.map(r => r.author)

    expect(authors).toContain('Michael Chan')
  })
})

describe('viewing a specific blog post', () => {
  test('succeeds with a valid id', async () => {
    const blogsAtStart = await helper.blogsInDb()

    const blogToView = blogsAtStart[0]

    const resultBlog = await api
      .get(`/api/blogs/${blogToView.id}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(resultBlog.body).toEqual(blogToView)
  })

  test('fails with status code 404 if blog post does not exist', async () => {
    const validNonExistingId = await helper.nonExistingId()

    console.log('valid non-existing id: ', validNonExistingId)

    await api.get(`/api/blogs/${validNonExistingId}`).expect(404)
  })

  test('fails with status code 400 id is invalid', async () => {
    const invalidId = '5a3d5da59070081a82a3445'

    await api.get(`/api/blogs/${invalidId}`).expect(400)
  })
})

describe('addition of a new blog post', () => {
  test('succeeds with valid data', async () => {
    const newBlog = {
      title: 'Here is how to add a post',
      author: 'Fidel Kajander',
      url: 'fidel.me',
      likes: 0,
    }

    await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    const blogsAtEnd = await helper.blogsInDb()
    console.log('blogsAtEnd after added a post', blogsAtEnd)
    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length + 1)

    const authors = blogsAtEnd.map(b => b.author)
    expect(authors).toContain('Fidel Kajander')
  })

  test('fails with status code 400 if data is invalid', async () => {
    const newBlog = {
      title: 'Here is how to not add a post',
      url: 'fidel.me',
      likes: 0,
    }

    await api.post('/api/blogs').send(newBlog).expect(400)

    const blogsAtEnd = await helper.blogsInDb()

    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length)
  })
})

describe('deletion of a blog post', () => {
  test('succeeds with status code 204 if id is valid', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[0]

    await api.delete(`/api/blogs/${blogToDelete.id}`).expect(204)

    const blogsAtEnd = await helper.blogsInDb()

    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length - 1)

    const titles = blogsAtEnd.map(r => r.title)

    expect(titles).not.toContain(blogToDelete.title)
  })
})

describe('Missing likes', () => {
  test('likes property missing from request', async () => {
    let newBlog = {
      title: 'Here is how not to get likes',
      author: 'Fidel Kajander',
      url: 'fidel.me',
    }

    const response = await api
      .post('/api/blogs')
      .send(newBlog)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    expect(response.body).toHaveProperty('likes')
    expect(response.body.likes).toEqual(0)
  })
})

describe('Missing title and URL', () => {
  test('a new post without required properties is not added', async () => {
    const newBlog = {
      author: 'Fidel Kajander',
      likes: 3,
    }

    await api.post('/api/blogs').send(newBlog).expect(400)

    const blogsAtEnd = await helper.blogsInDb()

    expect(blogsAtEnd).toHaveLength(helper.initialBlogs.length)
  })
})

describe('property check', () => {
  test('a blog post property id is not _id', async () => {
    const response = await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/)

    //console.log('a blog post property id is not _id response', response.body)
    expect(response.body[0].id).toBeDefined()
    expect(response.body[1]).toHaveProperty('id')
  })
})

afterAll(() => {
  mongoose.connection.close()
})
