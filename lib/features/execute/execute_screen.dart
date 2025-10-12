import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class ExecuteScreen extends StatelessWidget {
  const ExecuteScreen({super.key});
  Future<void> _open(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Execute', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        Wrap(spacing: 8, children: [
          ElevatedButton(onPressed: () => _open('https://www.raizinvest.com.au/'), child: const Text('Raiz')),
          ElevatedButton(onPressed: () => _open('https://www.spaceship.com.au/'), child: const Text('Spaceship')),
          ElevatedButton(onPressed: () => _open('https://www.commsec.com.au/'), child: const Text('CommSec Pocket')),
          ElevatedButton(onPressed: () => _open('https://www.stockspot.com.au/'), child: const Text('Stockspot')),
          ElevatedButton(onPressed: () => _open('https://www.quietgrowth.com.au/'), child: const Text('QuietGrowth')),
        ]),
      ],
    );
  }
}