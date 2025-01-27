const express = require('express');
const ejs = require('ejs');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

// 静态文件服务
app.use(express.static('public'));

// 首页路由
app.get('/', (req, res) => {
  res.render('index', { title: 'PDF生成器' });
});

// PDF生成路由
app.get('/generate-pdf', async (req, res) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // 渲染模板
    const templateName = req.query.template || 'pdf-template';
    // 处理项目列表
    const items = req.query.items ? 
      req.query.items.split('\n').filter(item => item.trim()) : 
      [];

    const html = await ejs.renderFile(
      path.join(__dirname, 'templates', `${templateName}.ejs`),
      { 
        data: {
          ...req.query,
          items
        }
      }
    );

    await page.setContent(html);
    // 生成PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    await browser.close();

    // 验证PDF文件
    if (!pdfBuffer || pdfBuffer.length < 100) {
      throw new Error('Invalid PDF generated');
    }

    // 创建PDF目录
    const fs = require('fs');
    const pdfDir = path.join(__dirname, 'pdfstore');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir);
    }
    
    // 保存PDF到本地
    const fileName = `pdf_${Date.now()}.pdf`;
    const filePath = path.join(pdfDir, fileName);
    // await fs.promises.writeFile(filePath, pdfBuffer);

    // 返回PDF文件
    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="generated.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.write(pdfBuffer, 'binary');
    res.end();
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
