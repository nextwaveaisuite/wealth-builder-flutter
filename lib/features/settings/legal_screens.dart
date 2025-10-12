import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;

class LegalPage extends StatefulWidget {
  final String title;
  final String assetPath;
  const LegalPage(this.title, this.assetPath, {super.key});
  @override
  State<LegalPage> createState() => _LegalPageState();
}
class _LegalPageState extends State<LegalPage> {
  String _text = '...';
  @override
  void initState() {
    super.initState();
    rootBundle.loadString(widget.assetPath).then((s) => setState(() => _text = s));
  }
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: SingleChildScrollView(padding: const EdgeInsets.all(12), child: Text(_text)),
    );
  }
}