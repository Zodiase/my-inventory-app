#!/usr/bin/env swift

// Decode QR symbols from local image files using macOS Vision.
// This intentionally stays local: inventory photos can contain household
// information and do not need to be uploaded to a third-party decoder.

import Foundation
import ImageIO
import Vision

let paths = Array(CommandLine.arguments.dropFirst())
guard !paths.isEmpty else {
    fputs("usage: decode-qr.swift IMAGE...\n", stderr)
    exit(64)
}

var found = false
for path in paths {
    let url = URL(fileURLWithPath: path)
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        fputs("error: cannot read image: \(path)\n", stderr)
        continue
    }

    let request = VNDetectBarcodesRequest()
    request.symbologies = [.qr]
    let handler = VNImageRequestHandler(cgImage: image, options: [:])
    do {
        try handler.perform([request])
    } catch {
        fputs("error: Vision failed for \(path): \(error)\n", stderr)
        continue
    }

    for result in request.results ?? [] {
        guard let payload = result.payloadStringValue else { continue }
        found = true
        print("\(path)\t\(payload)")
    }
}

exit(found ? 0 : 1)
