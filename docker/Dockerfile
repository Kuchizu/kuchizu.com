FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

COPY public/index.html /usr/share/nginx/html/
COPY public/404.html /usr/share/nginx/html/
COPY public/robots.txt /usr/share/nginx/html/
COPY public/sitemap.xml /usr/share/nginx/html/
COPY public/css/ /usr/share/nginx/html/css/
COPY public/js/ /usr/share/nginx/html/js/
COPY public/images/ /usr/share/nginx/html/images/
COPY .commit /usr/share/nginx/html/.commit

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
