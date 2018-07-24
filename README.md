[![npm](https://img.shields.io/npm/v/seisplotjs-seedcodec.svg)](https://www.npmjs.com/package/seisplotjs-seedcodec)

# seisplotjs-seedcodec
decompression of common seismic data formats as in miniseed, steim1 and steim2

See [SEED Reference Manual](http://www.fdsn.org/media/_s/publications/SEEDManual_V2.4.pdf), appendix B for information about the steim1 and steim2 compression algorithms and the Blockette 1000 section for list of known compression codes.

In most cases this will probably not be used directly and the data will be encoded as compressed data in a miniseed record, and so seisplotjs-miniseed will be used instead.

### Install

```
npm install seisplotjs-seedcodec
```

[API Documentation](http://www.seis.sc.edu/software/seisplotjs/seedcodec/)
