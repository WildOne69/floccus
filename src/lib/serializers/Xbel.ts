import Serializer from '../interfaces/Serializer'
import { Bookmark, Folder, ItemLocation } from '../Tree'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'

class XbelSerializer implements Serializer {
  serialize(folder: Folder) {
    const xbelObj = this._serializeFolder(folder)
    const xmlBuilder = new XMLBuilder({format: true, preserveOrder: true, ignoreAttributes: false})
    return xmlBuilder.build(xbelObj)
  }

  deserialize(xbel: string) {
    const parser = new XMLParser({preserveOrder: true, ignorePiTags: true, ignoreAttributes: false})
    const xmlObj = parser.parse(xbel)

    if (!Array.isArray(xmlObj[0].xbel)) {
      throw new Error(
        'Parse Error: ' + xbel
      )
    }

    const rootFolder = new Folder({ id: 0, title: 'root', location: ItemLocation.SERVER })
    try {
      this._parseFolder(xmlObj[0].xbel, rootFolder)
    } catch (e) {
      throw new Error(
        'Parse Error: ' + e.message
      )
    }
    return rootFolder
  }

  _parseFolder(xbelObj, folder: Folder) {
    /* parse depth first */

    xbelObj
      .forEach(node => {
        let item
        if (typeof node.bookmark !== 'undefined') {
          item = new Bookmark({
            id: parseInt(node[':@']['@_id']),
            parentId: folder.id,
            url: node[':@']['@_href'],
            title: node.bookmark[0]['#text'],
            location: ItemLocation.SERVER,
          })
        } else if (typeof node.folder !== 'undefined') {
          item = new Folder({
            id: parseInt(node[':@']['@_id']),
            title: node[':@']['@_title'],
            parentId: folder.id,
            location: ItemLocation.SERVER,
          })
          this._parseFolder(node.folder, item)
        } else {
          return
        }

        folder.children.push(item)
      })
  }

  _serializeFolder(folder: Folder) {
    return folder.children
      .map(child => {
        if (child instanceof Bookmark) {
          return {
            bookmark: [
              {'#text': child.title}
            ],
            ':@': {
              '@_href': child.url,
              '@_id': String(child.id)
            }
          }
        }

        if (child instanceof Folder) {
          return {
            folder: this._serializeFolder(child),
            ':@': {
              ...('id' in child && {'@_id': String(child.id)}),
              '@_title': child.title,
            }
          }
        }
      })
  }
}

export default new XbelSerializer()
